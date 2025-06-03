import React, { useState, useRef, useEffect } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions
} from "react-native";
import axios from "axios";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Replace with your Gemini API provider's credentials
const GEMINI_API_KEY = "AIzaSyBZL5l3Op4ncIpHtrZwGO7f-ZImtbT06QY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// System prompt for medical AI
const MEDICAL_SYSTEM_PROMPT = `You are MedAssist, a comprehensive medical AI assistant. Your capabilities include:

1. **Medical Consultation**: Provide accurate medical information, symptom analysis, and health guidance
2. **Image Analysis**: Analyze medical images, skin conditions, wounds, rashes, medical reports, prescriptions, and X-rays
3. **General Health**: Answer questions about nutrition, exercise, mental health, and wellness
4. **Medical Records**: Help interpret lab reports, prescriptions, and medical documents

Guidelines:
- Always maintain conversation context and remember previous symptoms/conditions
- For image analysis, provide detailed observations but remind users to consult healthcare professionals
- Clearly state you're not a replacement for professional medical diagnosis
- Ask relevant follow-up questions based on context
- For serious symptoms or emergency situations, immediately recommend medical attention
- Be compassionate, professional, and thorough in your responses

Remember: You can discuss any health-related topic and analyze medical images, but always emphasize the importance of professional medical consultation for proper diagnosis and treatment.`;

interface Message {
    text: string;
    sender: "user" | "bot";
    timestamp?: number;
    image?: string;
    imageAnalysis?: boolean;
}

interface ConversationTurn {
    role: "user" | "model";
    parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
}

export default function ChatbotScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            text: "Hello! I'm MedAssist, your comprehensive health assistant. I can help with:\n\n• Medical questions and symptoms\n• Image analysis (skin conditions, wounds, medical reports)\n• Health and wellness guidance\n• Prescription and lab report interpretation\n\nWhat can I help you with today?",
            sender: "bot",
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([
        {
            role: "model",
            parts: [{
                text: "Hello! I'm MedAssist, your comprehensive health assistant. I can help with medical questions, analyze images, and provide health guidance. What can I help you with today?"
            }]
        }
    ]);

    // Request camera and media library permissions
    const requestPermissions = async () => {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
            Alert.alert(
                'Permissions Required',
                'Camera and photo library access are needed for image analysis features.',
                [{ text: 'OK' }]
            );
        }
    };

    useEffect(() => {
        requestPermissions();
    }, []);

    // Convert image to base64
    const convertImageToBase64 = async (imageUri: string): Promise<string> => {
        try {
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return base64;
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw new Error('Failed to process image');
        }
    };

    // Image picker functions
    const showImagePicker = () => {
        Alert.alert(
            'Select Image',
            'Choose how you want to add a medical image for analysis:',
            [
                {
                    text: 'Camera',
                    onPress: () => takePhoto(),
                },
                {
                    text: 'Gallery',
                    onPress: () => pickImage(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const takePhoto = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
    };

    const sendMessage = async () => {
        if (!input.trim() && !selectedImage) return;

        const messageText = input.trim() || "Please analyze this medical image.";
        const userMessage: Message = {
            text: messageText,
            sender: "user",
            timestamp: Date.now(),
            image: selectedImage || undefined,
            imageAnalysis: !!selectedImage
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        const currentImage = selectedImage;
        setSelectedImage(null);
        setIsLoading(true);

        try {
            let newUserTurn: ConversationTurn;

            if (currentImage) {
                // Handle image + text message
                const base64Image = await convertImageToBase64(currentImage);
                const imagePrompt = `${MEDICAL_SYSTEM_PROMPT}\n\nPlease analyze this medical image in detail. User's question/context: ${messageText}`;

                newUserTurn = {
                    role: "user",
                    parts: [
                        { text: imagePrompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                };
            } else {
                // Handle text-only message
                const contextualPrompt = `${MEDICAL_SYSTEM_PROMPT}

Previous conversation context:
${conversationHistory.slice(-6).map(turn =>
                    turn.parts.map(part => part.text).filter(Boolean).join(' ')
                ).filter(Boolean).join('\n')}

Current question: ${messageText}

Please provide a comprehensive medical response considering the conversation context.`;

                newUserTurn = {
                    role: "user",
                    parts: [{ text: contextualPrompt }]
                };
            }

            const updatedHistory = [...conversationHistory, newUserTurn];
            setConversationHistory(updatedHistory);

            // Prepare request for Gemini API
            const requestPayload = {
                contents: [newUserTurn], // Send only current turn for better processing
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1500,
                    candidateCount: 1
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    }
                ]
            };

            const response = await axios.post(
                `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
                requestPayload,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 60000 // 60 seconds for image processing
                }
            );

            if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response from AI service');
            }

            const botReply = response.data.candidates[0].content.parts[0].text;

            const botMessage: Message = {
                text: botReply,
                sender: "bot",
                timestamp: Date.now()
            };
            setMessages((prev) => [...prev, botMessage]);

            // Add bot response to conversation history
            const newBotTurn: ConversationTurn = {
                role: "model",
                parts: [{ text: botReply }]
            };

            setConversationHistory(prevHistory => [...prevHistory, newBotTurn]);

        } catch (error) {
            console.error("Error sending message:", error);

            let errorMessage = "I'm experiencing technical difficulties. Please try again.";

            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                console.error("API Error:", {
                    status: statusCode,
                    data: error.response?.data,
                    message: error.message
                });

                switch (statusCode) {
                    case 400:
                        errorMessage = "There was an issue processing your request. Please try rephrasing your question.";
                        break;
                    case 429:
                        errorMessage = "Too many requests. Please wait a moment and try again.";
                        break;
                    case 503:
                        errorMessage = "Medical AI service is temporarily busy. Please try again in a few moments.";
                        break;
                    default:
                        errorMessage = "Connection error. Please check your internet and try again.";
                }
            } else if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    errorMessage = "Request timed out. Please try with a smaller image or simpler question.";
                } else if (error.message.includes('image')) {
                    errorMessage = "Failed to process the image. Please try with a different image.";
                }
            }

            const errorBotMessage: Message = {
                text: errorMessage,
                sender: "bot",
                timestamp: Date.now()
            };
            setMessages((prev) => [...prev, errorBotMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear conversation
    const clearConversation = () => {
        const initialMessage: Message = {
            text: "Hello! I'm MedAssist, your comprehensive health assistant. I can help with medical questions, analyze images, and provide health guidance. What can I help you with today?",
            sender: "bot",
            timestamp: Date.now()
        };

        setMessages([initialMessage]);
        setConversationHistory([
            {
                role: "model",
                parts: [{ text: initialMessage.text }]
            }
        ]);
        setSelectedImage(null);
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const screenWidth = Dimensions.get('window').width;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerText}>MedAssist Pro</Text>
                    <Text style={styles.subHeaderText}>Medical AI + Image Analysis</Text>
                </View>
                <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
                    <Text style={styles.clearButtonText}>New Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Chat messages */}
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.chatContainer}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((message, index) => (
                    <View
                        key={`${index}-${message.timestamp}`}
                        style={[
                            styles.message,
                            message.sender === "user" ? styles.userMessage : styles.botMessage,
                        ]}
                    >
                        {message.image && (
                            <Image
                                source={{ uri: message.image }}
                                style={[styles.messageImage, { width: screenWidth * 0.6 }]}
                                resizeMode="contain"
                            />
                        )}
                        <Text style={[
                            styles.messageText,
                            message.sender === "user" ? styles.userMessageText : styles.botMessageText
                        ]}>
                            {message.text}
                        </Text>
                        {message.imageAnalysis && message.sender === "user" && (
                            <Text style={styles.imageLabel}>📸 Medical Image Analysis</Text>
                        )}
                        {message.timestamp && (
                            <Text style={styles.timestamp}>
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        )}
                    </View>
                ))}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#1976D2" />
                        <Text style={styles.loadingText}>
                            {selectedImage || messages.some(m => m.imageAnalysis)
                                ? "Analyzing medical image..."
                                : "Processing medical query..."}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Selected Image Preview */}
            {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.removeImageButton} onPress={removeSelectedImage}>
                        <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.imagePreviewLabel}>Medical Image Ready for Analysis</Text>
                </View>
            )}

            {/* Input area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.imageButton} onPress={showImagePicker}>
                    <Text style={styles.imageButtonText}>📷</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder={selectedImage ? "Describe what you want to know about this image..." : "Ask me anything about health, symptoms, or upload medical images..."}
                    placeholderTextColor="#999"
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={1000}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                    style={[styles.sendButton, ((!input.trim() && !selectedImage) || isLoading) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                >
                    <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>

            {/* Enhanced Disclaimer */}
            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                    ⚕️ This AI provides medical information and image analysis for educational purposes.
                    Always consult healthcare professionals for proper diagnosis and treatment.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f9fc",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: "#1976D2",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        flex: 1,
    },
    headerText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    subHeaderText: {
        color: "#BBDEFB",
        fontSize: 12,
        marginTop: 2,
    },
    clearButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    clearButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 180,
    },
    message: {
        padding: 12,
        borderRadius: 18,
        marginVertical: 6,
        maxWidth: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    userMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#1976D2",
    },
    botMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#E3F2FD",
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: "#ffffff",
    },
    botMessageText: {
        color: "#333333",
    },
    messageImage: {
        height: 200,
        borderRadius: 12,
        marginBottom: 8,
    },
    imageLabel: {
        fontSize: 12,
        color: "#BBDEFB",
        fontStyle: "italic",
        marginTop: 4,
    },
    timestamp: {
        fontSize: 10,
        color: "#999",
        marginTop: 4,
        alignSelf: "flex-end",
    },
    imagePreviewContainer: {
        margin: 16,
        padding: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#1976D2",
        borderStyle: "dashed",
        alignItems: "center",
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    imagePreviewLabel: {
        fontSize: 12,
        color: "#1976D2",
        fontWeight: "600",
        marginTop: 8,
    },
    removeImageButton: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#f44336",
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    removeImageText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginVertical: 8,
        backgroundColor: "#f0f0f0",
        padding: 8,
        borderRadius: 16,
    },
    loadingText: {
        marginLeft: 8,
        color: "#666",
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#e0e0e0",
        backgroundColor: "#fff",
        position: "absolute",
        bottom: 50,
        width: "100%",
    },
    imageButton: {
        backgroundColor: "#4CAF50",
        borderRadius: 25,
        padding: 12,
        marginRight: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    imageButtonText: {
        fontSize: 18,
    },
    input: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 18,
        fontSize: 16,
        maxHeight: 100,
        textAlignVertical: "top",
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: "#1976D2",
        borderRadius: 25,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#ccc",
    },
    sendButtonText: {
        color: "#fff",
        fontSize: 16,
    },
    disclaimerContainer: {
        padding: 12,
        backgroundColor: "#E8F5E8",
        position: "absolute",
        bottom: 0,
        width: "100%",
        borderTopWidth: 1,
        borderColor: "#e0e0e0",
    },
    disclaimerText: {
        fontSize: 11,
        color: "#2E7D32",
        textAlign: "center",
        fontWeight: "500",
    }
});