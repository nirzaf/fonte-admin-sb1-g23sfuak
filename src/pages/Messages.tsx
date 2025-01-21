import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import type { ContactUsResponse } from '../lib/supabase';

export default function Messages() {
  const [messages, setMessages] = useState<ContactUsResponse[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactUsResponse | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contactus_response')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contactus_response')
        .update({ mark_as_read: true })
        .eq('id', id);

      if (error) throw error;

      setMessages(messages.map(msg => 
        msg.id === id ? { ...msg, mark_as_read: true } : msg
      ));
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contactus_response')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages(messages.filter(msg => msg.id !== id));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Contact Messages
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.map((message) => (
              <TableRow 
                key={message.id}
                sx={{ 
                  backgroundColor: message.mark_as_read ? 'inherit' : 'rgba(25, 118, 210, 0.08)'
                }}
              >
                <TableCell>{formatDate(message.created_at)}</TableCell>
                <TableCell>{message.name}</TableCell>
                <TableCell>{message.email}</TableCell>
                <TableCell>{message.region_code}</TableCell>
                <TableCell>
                  <Chip 
                    label={message.mark_as_read ? 'Read' : 'Unread'}
                    color={message.mark_as_read ? 'default' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setSelectedMessage(message);
                      setOpenDialog(true);
                    }}
                    title="View Message"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  {!message.mark_as_read && (
                    <IconButton
                      onClick={() => handleMarkAsRead(message.id)}
                      title="Mark as Read"
                    >
                      <MarkEmailReadIcon />
                    </IconButton>
                  )}
                  <IconButton
                    onClick={() => handleDelete(message.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Message Details</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                From
              </Typography>
              <Typography paragraph>
                {selectedMessage.name} ({selectedMessage.email})
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Phone
              </Typography>
              <Typography paragraph>
                {selectedMessage.phone || 'Not provided'}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Region
              </Typography>
              <Typography paragraph>
                {selectedMessage.region_code}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Message
              </Typography>
              <Typography paragraph>
                {selectedMessage.message}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Preferences
              </Typography>
              <Typography>
                {selectedMessage.is_ok_receive_communication 
                  ? 'Agreed to receive communications' 
                  : 'Did not agree to receive communications'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedMessage && !selectedMessage.mark_as_read && (
            <Button 
              onClick={() => {
                handleMarkAsRead(selectedMessage.id);
                setOpenDialog(false);
              }}
            >
              Mark as Read
            </Button>
          )}
          <Button onClick={() => setOpenDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
