import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    Alert,
    StatusBar,
    Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewError } from 'react-native-webview/lib/WebViewTypes';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function BrowserScreen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');
    const [hasError, setHasError] = useState(false);

    // Flipkart Health+ URL
    const FLIPKART_HEALTH_URL = 'https://www.truemeds.in/order-online?utm_source=google&utm_medium=Near_Me&utm_campaign=Sok_Google_search_Pharmacy_16thApril25&adgroupid=178397310876&utm_term=online%20pharmacy%20near%20me&utm_adid={adid}&gad_source=1&gad_campaignid=22469470052&gbraid=0AAAAABfzGfjLBB-Ggf_01ucQ_0iKnQcxP&gclid=Cj0KCQjwuvrBBhDcARIsAKRrkjf6LJNh7JCEEDsQouQEXgb8lD0C2Ig3JMJ2wVaT-pSFc24CzVXz9KUaAimbEALw_wcB';

    useEffect(() => {
        // Auto-hide loading after 10 seconds if still loading
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
            }
        }, 10000);

        return () => clearTimeout(loadingTimeout);
    }, [isLoading]);

    const handleNavigationStateChange = (navState: {
        canGoBack: boolean;
        canGoForward: boolean;
        url: string;
    }) => {
        setCanGoBack(navState.canGoBack);
        setCanGoForward(navState.canGoForward);
        setCurrentUrl(navState.url);
        setHasError(false);
    };

    const handleLoadStart = () => {
        setIsLoading(true);
        setLoadingProgress(0);
        setHasError(false);
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
        setLoadingProgress(1);
    };

    const handleLoadProgress = ({ nativeEvent }: { nativeEvent: { progress: number } }) => {
        setLoadingProgress(nativeEvent.progress);
        if (nativeEvent.progress === 1) {
            // Small delay to ensure content is fully rendered
            setTimeout(() => {
                setIsLoading(false);
            }, 500);
        }
    };
    const handleError = (syntheticEvent: { nativeEvent: WebViewError }) => {
        const { nativeEvent } = syntheticEvent;
        console.warn('WebView error: ', nativeEvent);
        setIsLoading(false);
        setHasError(true);

        Alert.alert(
            'Connection Error',
            'Unable to load the page. Please check your internet connection and try again.',
            [
                {
                    text: 'Retry', onPress: () => {
                        setHasError(false);
                        webViewRef.current?.reload();
                    }
                },
                { text: 'Go Back', onPress: () => router.back() },
            ]
        );
    };

    const goBack = () => {
        if (canGoBack && webViewRef.current) {
            webViewRef.current.goBack();
        }
    };

    const goForward = () => {
        if (canGoForward && webViewRef.current) {
            webViewRef.current.goForward();
        }
    };

    const refresh = () => {
        if (webViewRef.current) {
            setHasError(false);
            webViewRef.current.reload();
        }
    };

    const LoadingScreen = () => (
        <View style={styles.loadingScreen}>
            <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#1976D2" />
                <Text style={styles.loadingTitle}>Loading Pharmacy</Text>
                <Text style={styles.loadingSubtitle}>
                    {Math.round(loadingProgress * 100)}% loaded
                </Text>
                <View style={styles.progressBarContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${loadingProgress * 100}%` }
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    const ErrorScreen = () => (
        <View style={styles.errorScreen}>
            <Ionicons name="wifi-outline" size={64} color="#CCCCCC" />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>
                Unable to load the pharmacy page. Please check your internet connection.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.headerButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={28} color="#1976D2" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Buy Medicines</Text>
                        <Text style={styles.headerSubtitle}>Truemeds.in</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/home')}
                        style={styles.headerButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="home" size={24} color="#1976D2" />
                    </TouchableOpacity>
                </View>

                {/* Navigation Controls */}
                <View style={styles.navigationBar}>
                    <TouchableOpacity
                        onPress={goBack}
                        style={[styles.navButton, !canGoBack && styles.disabledButton]}
                        disabled={!canGoBack}
                        activeOpacity={0.6}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={20}
                            color={canGoBack ? "#1976D2" : "#CCCCCC"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={goForward}
                        style={[styles.navButton, !canGoForward && styles.disabledButton]}
                        disabled={!canGoForward}
                        activeOpacity={0.6}
                    >
                        <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={canGoForward ? "#1976D2" : "#CCCCCC"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={refresh}
                        style={styles.navButton}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="refresh" size={20} color="#1976D2" />
                    </TouchableOpacity>

                    {/* URL Display */}
                    <View style={styles.urlContainer}>
                        <Ionicons name="lock-closed" size={14} color="#4CAF50" />
                        <Text style={styles.urlText} numberOfLines={1}>
                            truemeds.in
                        </Text>
                    </View>
                </View>

                {/* Content Area */}
                <View style={styles.contentContainer}>
                    {hasError ? (
                        <ErrorScreen />
                    ) : (
                        <>
                            <WebView
                                ref={webViewRef}
                                source={{ uri: FLIPKART_HEALTH_URL }}
                                style={styles.webview}
                                onLoadStart={handleLoadStart}
                                onLoadEnd={handleLoadEnd}
                                onLoadProgress={handleLoadProgress}
                                onNavigationStateChange={handleNavigationStateChange}
                                onError={handleError}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                startInLoadingState={false}
                                scalesPageToFit={Platform.OS === 'android'}
                                allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
                                mixedContentMode="compatibility"
                                cacheEnabled={true}
                                incognito={false}
                                allowsInlineMediaPlayback={true}
                                mediaPlaybackRequiresUserAction={false}
                                userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
                                injectedJavaScript={`
                                    // Improve mobile experience
                                    const meta = document.createElement('meta');
                                    meta.setAttribute('name', 'viewport');
                                    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                                    document.getElementsByTagName('head')[0].appendChild(meta);
                                    
                                    // Hide any loading overlays after 3 seconds
                                    setTimeout(() => {
                                        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [id*="loading"]');
                                        loadingElements.forEach(el => el.style.display = 'none');
                                    }, 3000);
                                    
                                    true;
                                `}
                            />

                            {/* Loading Overlay */}
                            {isLoading && <LoadingScreen />}
                        </>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    safeArea: {
        flex: 1,
    }, header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 44 : 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        zIndex: 10,
    },
    headerButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#7F8C8D',
        marginTop: 2,
    }, navigationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        zIndex: 9,
    },
    navButton: {
        padding: 8,
        marginRight: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    disabledButton: {
        opacity: 0.5,
        backgroundColor: '#F5F5F5',
    },
    urlContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    urlText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#666666',
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    webview: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        alignItems: 'center',
        padding: 20,
    },
    loadingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginTop: 16,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: '#7F8C8D',
        marginTop: 8,
    },
    progressBarContainer: {
        width: width * 0.6,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#1976D2',
        borderRadius: 2,
    },
    errorScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
        marginTop: 16,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: '#7F8C8D',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1976D2',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});