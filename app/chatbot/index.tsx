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
    ActivityIndicator
} from "react-native";
import axios from "axios";

// Replace with your Gemini API provider's credentials
const GEMINI_API_KEY = "AIzaSyAhEEMH1-OtYB8eYkvM4WlKskUjFKvtJhk"; // Replace with your actual Gemini API key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"; // Replace with the correct endpoint

export default function ChatbotScreen() {
    const [messages, setMessages] = useState<{ text: string; sender: "user" | "bot" }[]>([
        {
            text: "Hello! I'm MedAssist, your health assistant. I can provide general medical information and guidance. What health question can I help you with today?",
            sender: "bot"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const [conversationHistory, setConversationHistory] = useState([
        {
            role: "model",
            parts: [{ text: "Hello! I'm MedAssist, your health assistant. I can provide general medical information and guidance. What health question can I help you with today?" }]
        }
    ]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: { text: string; sender: "user" | "bot" } = { text: input, sender: "user" };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Update conversation history with user message
        const updatedHistory = [
            ...conversationHistory,
            {
                role: "user",
                parts: [{ text: input }]
            }
        ];

        setConversationHistory(updatedHistory);

        try {            // Add context by prepending it to the user's message
            const medicalPreamble = `You are MedAssist, a medical AI assistant that provides helpful, accurate, and ethical medical information. You clearly state you're not a replacement for professional medical advice. You ask clarifying questions if symptoms or concerns aren't clear. You focus exclusively on health and medical topics and politely redirect non-medical questions to health topics instead. You respond in a compassionate manner appropriate for medical discussions. Keep responses concise.\n\nUser query: `;

            // Prepare the conversation without system role
            const modifiedHistory = updatedHistory.map(msg => ({
                role: msg.role === "system" ? "user" : msg.role,
                parts: msg.role === "user" && updatedHistory.indexOf(msg) === updatedHistory.length - 1
                    ? [{ text: medicalPreamble + msg.parts[0].text }]
                    : msg.parts
            })); const response = await axios.post(
                `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
                {
                    contents: modifiedHistory,
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 800
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const botReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process your medical question. Could you rephrase it?";

            // For display, we keep the normal conversation
            const botMessage: { text: string; sender: "user" | "bot" } = { text: botReply, sender: "bot" };
            setMessages((prev) => [...prev, botMessage]);

            // For history, we add just the model's response
            setConversationHistory([
                ...updatedHistory,
                {
                    role: "model",
                    parts: [{ text: botReply }]
                }
            ]);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error communicating with Gemini API:", error.response?.data || error.message);
            } else {
                console.error("Error communicating with Gemini API:", (error as Error).message || error);
            }
            const errorMessage: { text: string; sender: "user" | "bot" } = {
                text: "I'm having trouble connecting to my medical database. Please try again with your health question.",
                sender: "bot"
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>MedAssist</Text>
                <Text style={styles.subHeaderText}>Your Health Assistant</Text>
            </View>

            {/* Chat messages */}
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.chatContainer}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((message, index) => (
                    <View
                        key={index}
                        style={[
                            styles.message,
                            message.sender === "user" ? styles.userMessage : styles.botMessage,
                        ]}
                    >
                        <Text style={[
                            styles.messageText,
                            message.sender === "user" ? styles.userMessageText : styles.botMessageText
                        ]}>
                            {message.text}
                        </Text>
                    </View>
                ))}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#1976D2" />
                        <Text style={styles.loadingText}>Consulting medical knowledge...</Text>
                    </View>
                )}
            </ScrollView>

            {/* Input area */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask me about health concerns..."
                    placeholderTextColor="#999"
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isLoading}>
                    <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                    This app provides general information only and is not a substitute for professional medical advice.
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
        backgroundColor: "#1976D2", // blue
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    subHeaderText: {
        color: "#BBDEFB", // light blue
        fontSize: 14,
        marginTop: 2,
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 100,
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
        backgroundColor: "#1976D2", // blue
    },
    botMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#E3F2FD", // light blue
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
        bottom: 30,
        width: "100%",
    },
    input: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 18,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: "#1976D2", // blue
        borderRadius: 25,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonText: {
        color: "#fff",
        fontSize: 16,
    },
    disclaimerContainer: {
        padding: 8,
        backgroundColor: "#E3F2FD", // light blue
        position: "absolute",
        bottom: 0,
        width: "100%",
        borderTopWidth: 1,
        borderColor: "#e0e0e0",
    },
    disclaimerText: {
        fontSize: 10,
        color: "#666",
        textAlign: "center",
    }
});
