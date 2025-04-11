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
} from "react-native";
import axios from "axios";

// Replace with your Llama API provider's credentials
const LLAMA_API_KEY = "ba3ab8ce-8d02-453b-9a2c-278d2e5ec130"; // Replace with your actual API key
const LLAMA_API_URL = "https://api.replicate.com/v1/predictions"; // Replace with actual endpoint (e.g., xAI Grok API, Replicate, etc.)

export default function ChatbotScreen() {
    const [messages, setMessages] = useState<{ text: string; sender: "user" | "bot" }[]>([]);
    const [input, setInput] = useState("");
    const scrollViewRef = useRef<ScrollView>(null);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: { text: string; sender: "user" | "bot" } = { text: input, sender: "user" };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        try {
            const response = await axios.post(
                LLAMA_API_URL,
                {
                    version: "12345abcde", // Replace with the correct version ID
                    input: {
                        prompt: input
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${LLAMA_API_KEY}`
                    }
                }
            );

            const botReply = response.data?.output || "Sorry, I couldn't generate a reply.";
            const botMessage: { text: string; sender: "user" | "bot" } = { text: botReply, sender: "bot" };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error communicating with Llama API:", (error as any).response?.data || (error as any).message);
            const errorMessage: { text: string; sender: "user" | "bot" } = { text: "Something went wrong. Please try again later.", sender: "bot" };
            setMessages((prev) => [...prev, errorMessage]);
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
                <Text style={styles.headerText}>OptimaHealth</Text>
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
                        <Text style={styles.messageText}>{message.text}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Input area */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask me anything about your health..."
                    placeholderTextColor="#999"
                    value={input}
                    onChangeText={setInput}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// Styles remain unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#e9f5f2",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: "#4CAF50",
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
        fontSize: 22,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    message: {
        padding: 12,
        borderRadius: 16,
        marginVertical: 6,
        maxWidth: "80%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    userMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#4CAF50",
    },
    botMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#d4f1e3",
    },
    messageText: {
        color: "#333",
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#fff",
        position: "absolute",
        bottom: 0,
        width: "100%",
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f0f0",
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 18,
        fontSize: 16,
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: "#4CAF50",
        borderRadius: 25,
        padding: 12,
    },
    sendButtonText: {
        color: "#fff",
        fontSize: 18,
    },
});