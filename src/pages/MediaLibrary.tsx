import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Button,
    LinearProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import imageCompression from 'browser-image-compression';
import { imagekit } from '../lib/imagekit';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

// Firebase function URL - replace with your actual Firebase function URL
const IMAGEKIT_AUTH_URL = 'https://YOUR_FIREBASE_REGION-YOUR_PROJECT_ID.cloudfunctions.net/imagekitAuth';

interface UploadProgress {
    compressing: boolean;
    uploading: boolean;
    progress: number;
}

interface MediaItem {
    url: string;
    fileId: string;
    fileName: string;
}

export default function MediaLibrary() {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
        compressing: false,
        uploading: false,
        progress: 0,
    });
    const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);

    const compressImage = async (file: File): Promise<File> => {
        const options = {
            maxSizeMB: 0.2, // 200KB
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        try {
            setUploadProgress(prev => ({ ...prev, compressing: true }));
            const compressedFile = await imageCompression(file, options);
            return compressedFile;
        } finally {
            setUploadProgress(prev => ({ ...prev, compressing: false }));
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Compress image
            const compressedFile = await compressImage(file);

            // Get authentication parameters from Firebase Function
            const authResponse = await fetch(IMAGEKIT_AUTH_URL);
            if (!authResponse.ok) {
                throw new Error('Failed to get authentication parameters');
            }

            const authData = await authResponse.json();
            
            // Upload to ImageKit
            setUploadProgress(prev => ({ ...prev, uploading: true }));
            
            const upload = await imagekit.upload({
                file: compressedFile,
                fileName: file.name,
                useUniqueFileName: true,
                token: authData.token,
                signature: authData.signature,
                expire: authData.expire,
                onUploadProgress: (progress) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        progress: Math.round((progress.loaded / progress.total) * 100),
                    }));
                },
            });

            // Add to media items
            setMediaItems(prev => [...prev, {
                url: upload.url,
                fileId: upload.fileId,
                fileName: upload.name,
            }]);

            toast.success('Image uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image. Please try again.');
        } finally {
            setUploadProgress({
                compressing: false,
                uploading: false,
                progress: 0,
            });
        }
    };

    const handleDelete = async (fileId: string) => {
        try {
            await imagekit.deleteFile(fileId);
            setMediaItems(prev => prev.filter(item => item.fileId !== fileId));
            toast.success('Image deleted successfully!');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete image. Please try again.');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Media Library
            </Typography>

            {/* Upload Button */}
            <Box sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploadProgress.compressing || uploadProgress.uploading}
                >
                    Upload Image
                    <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleUpload}
                    />
                </Button>
            </Box>

            {/* Progress Indicators */}
            {(uploadProgress.compressing || uploadProgress.uploading) && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                        {uploadProgress.compressing
                            ? 'Compressing image...'
                            : `Uploading: ${uploadProgress.progress}%`}
                    </Typography>
                    <LinearProgress
                        variant={uploadProgress.compressing ? 'indeterminate' : 'determinate'}
                        value={uploadProgress.progress}
                    />
                </Box>
            )}

            {/* Media Grid */}
            <Grid container spacing={3}>
                {mediaItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={item.fileId}>
                        <Card>
                            <CardMedia
                                component="img"
                                height="200"
                                image={item.url}
                                alt={item.fileName}
                                onClick={() => setSelectedImage(item)}
                                sx={{ cursor: 'pointer', objectFit: 'cover' }}
                            />
                            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                                    {item.fileName}
                                </Typography>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(item.fileId)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Image Preview Dialog */}
            <Dialog
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                maxWidth="md"
                fullWidth
            >
                {selectedImage && (
                    <>
                        <DialogTitle>{selectedImage.fileName}</DialogTitle>
                        <DialogContent>
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.fileName}
                                style={{ width: '100%', height: 'auto' }}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelectedImage(null)}>Close</Button>
                            <Button
                                component="a"
                                href={selectedImage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open Original
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
