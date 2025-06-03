import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    Platform,
    TextInput,
    Modal,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { savePrescription, getPrescriptions, deletePrescription, Prescription } from '../../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PrescriptionsScreen() {
    const router = useRouter();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImageViewModal, setShowImageViewModal] = useState(false);
    const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);
    const [newPrescription, setNewPrescription] = useState({
        title: '',
        notes: '',
        imageUri: '',
    });

    // Load prescriptions
    useFocusEffect(
        useCallback(() => {
            loadPrescriptions();
        }, [])
    );

    const loadPrescriptions = async () => {
        try {
            const loadedPrescriptions = await getPrescriptions();
            setPrescriptions(loadedPrescriptions.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ));
        } catch (error) {
            console.error('Error loading prescriptions:', error);
            Alert.alert('Error', 'Failed to load prescriptions');
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
                setNewPrescription(prev => ({
                    ...prev,
                    imageUri: result.assets[0].uri
                }));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const handleAddPrescription = async () => {
        if (!newPrescription.imageUri || !newPrescription.title) {
            Alert.alert('Required Fields', 'Please select an image and add a title');
            return;
        }

        try {
            const prescription: Prescription = {
                id: Math.random().toString(36).substr(2, 9),
                imageUri: newPrescription.imageUri,
                notes: newPrescription.notes,
                title: newPrescription.title,
                timestamp: new Date().toISOString(),
            };

            await savePrescription(prescription);
            await loadPrescriptions();
            setShowAddModal(false);
            setNewPrescription({ title: '', notes: '', imageUri: '' });
        } catch (error) {
            console.error('Error saving prescription:', error);
            Alert.alert('Error', 'Failed to save prescription');
        }
    };

    const handleDeletePrescription = async (id: string) => {
        Alert.alert(
            'Delete Prescription',
            'Are you sure you want to delete this prescription?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePrescription(id);
                            await loadPrescriptions();
                        } catch (error) {
                            console.error('Error deleting prescription:', error);
                            Alert.alert('Error', 'Failed to delete prescription');
                        }
                    },
                },
            ]
        );
    };

    const handleImagePress = (imageUri: string) => {
        setSelectedViewImage(imageUri);
        setShowImageViewModal(true);
    };

    const renderPrescriptionItem = ({ item }: { item: Prescription }) => (
        <View style={styles.prescriptionCard}>
            <TouchableOpacity onPress={() => handleImagePress(item.imageUri)}>
                <Image source={{ uri: item.imageUri }} style={styles.prescriptionImage} />
            </TouchableOpacity>
            <View style={styles.prescriptionInfo}>
                <Text style={styles.prescriptionTitle}>{item.title}</Text>
                <Text style={styles.prescriptionDate}>
                    {new Date(item.timestamp).toLocaleDateString()}
                </Text>
                {item.notes ? (
                    <Text style={styles.prescriptionNotes} numberOfLines={2}>
                        {item.notes}
                    </Text>
                ) : null}
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePrescription(item.id)}
            >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#1976D2" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Prescriptions</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Ionicons name="add" size={28} color="#1976D2" />
                </TouchableOpacity>
            </View>

            {/* Prescriptions List */}
            <FlatList
                data={prescriptions}
                renderItem={renderPrescriptionItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#BDC3C7" />
                        <Text style={styles.emptyText}>No prescriptions yet</Text>
                        <Text style={styles.emptySubText}>
                            Add your first prescription by tapping the + button
                        </Text>
                    </View>
                )}
            />

            {/* Image View Modal */}
            <Modal
                visible={showImageViewModal}
                transparent={true}
                onRequestClose={() => setShowImageViewModal(false)}
                animationType="fade"
            >
                <View style={styles.imageViewModalContainer}>
                    <TouchableOpacity
                        style={styles.closeImageButton}
                        onPress={() => setShowImageViewModal(false)}
                    >
                        <Ionicons name="close-circle" size={32} color="#fff" />
                    </TouchableOpacity>
                    {selectedViewImage && (
                        <Image
                            source={{ uri: selectedViewImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Add Prescription Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Prescription</Text>
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#95A5A6" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                            {newPrescription.imageUri ? (
                                <Image
                                    source={{ uri: newPrescription.imageUri }}
                                    style={styles.selectedImage}
                                />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera" size={32} color="#95A5A6" />
                                    <Text style={styles.imagePlaceholderText}>
                                        Tap to select prescription image
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            placeholder="Title"
                            value={newPrescription.title}
                            onChangeText={(text) =>
                                setNewPrescription((prev) => ({ ...prev, title: text }))
                            }
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Notes (optional)"
                            value={newPrescription.notes}
                            onChangeText={(text) =>
                                setNewPrescription((prev) => ({ ...prev, notes: text }))
                            }
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddPrescription}
                        >
                            <Text style={styles.saveButtonText}>Save Prescription</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
    },
    backButton: {
        padding: 8,
    },
    addButton: {
        padding: 8,
    },
    listContainer: {
        padding: 16,
    },
    prescriptionCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    prescriptionImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
    },
    prescriptionInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    prescriptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    prescriptionDate: {
        fontSize: 12,
        color: '#7F8C8D',
        marginBottom: 4,
    },
    prescriptionNotes: {
        fontSize: 14,
        color: '#34495E',
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#7F8C8D',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
    },
    modalCloseButton: {
        padding: 4,
    },
    imagePickerButton: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        marginBottom: 16,
        overflow: 'hidden',
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        marginTop: 8,
        fontSize: 14,
        color: '#95A5A6',
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#1976D2',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    imageViewModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeImageButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 10,
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
    },
});
