import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import type { Region, Category } from '../lib/supabase';
import React from 'react';

const defaultRegion: Partial<Region> = {
  name: '',
  locale: '',
  code: '',
  image_url_1: '',
  image_url_2: '',
  image_url_3: '',
  image_url_4: '',
  address_1: '',
  address_2: '',
  contact_no_1: '',
  contact_no_2: '',
  email_1: '',
  email_2: '',
  whatsapp_no: '',
  city: '',
  country: '',
  map_url: '',
  icon_url: '',
  enable_business_hours: false,
  business_hours: '',
};

export default function Regions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState<Partial<Region>>(defaultRegion);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRegions();
    fetchCategories();
  }, []);

  const fetchRegions = async () => {
    setLoading(true);
    try {
      // First verify the connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('regions')
        .select('count');

      if (connectionError) {
        console.error('Connection test failed:', connectionError);
        if (connectionError.code === '42P01') {
          toast.error('Table "regions" does not exist');
          return;
        }
        if (connectionError.code === 'PGRST301') {
          toast.error('Invalid API key or unauthorized access');
          return;
        }
        throw connectionError;
      }

      console.log('Connection test successful:', connectionTest);
    
      // Now fetch the actual data
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      console.log('Raw response:', { data, error, status: error?.code, details: error?.details, hint: error?.hint });

      if (error) {
        console.error('Data fetch error:', error);
        toast.error(`Error fetching regions: ${error.message}`);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No regions found in the database');
        toast.info('No regions available. Create your first region by clicking the Add Region button.');
        setRegions([]);
      } else {
        console.log('Regions found:', data.length);
        setRegions(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Failed to fetch regions. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchRegionCategories = async (regionId: number) => {
    try {
      const { data, error } = await supabase
        .from('region_category_mapping')
        .select('*, categories(*)')
        .eq('region_id', regionId);

      if (error) throw error;
      
      const regionCategories = data
        .map(mapping => mapping.categories)
        .filter(category => category !== null);
      
      setSelectedCategories(regionCategories);
    } catch (error) {
      console.error('Error fetching region categories:', error);
      toast.error('Failed to fetch region categories');
    }
  };

  const handleOpen = async (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setFormData(region);
      await fetchRegionCategories(region.id);
    } else {
      setEditingRegion(null);
      setFormData(defaultRegion);
      setSelectedCategories([]);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRegion(null);
    setFormData(defaultRegion);
    setSelectedCategories([]);
  };

  const handleChange = (field: keyof Region) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSwitchChange = (field: keyof Region) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim() || !formData.code?.trim()) {
      toast.error('Region name and code are required');
      return;
    }

    setLoading(true);
    try {
      if (editingRegion) {
        // Remove name, code, and locale from the update
        const { name, code, locale, ...updatableFields } = formData;
        const { error: updateError } = await supabase
          .from('regions')
          .update(updatableFields)
          .eq('id', editingRegion.id);

        if (updateError) throw updateError;

        // Update category mappings
        const { error: deleteMappingsError } = await supabase
          .from('region_category_mapping')
          .delete()
          .eq('region_id', editingRegion.id);

        if (deleteMappingsError) throw deleteMappingsError;

        if (selectedCategories.length > 0) {
          const mappings = selectedCategories.map(category => ({
            region_id: editingRegion.id,
            category_id: category.id
          }));

          const { error: insertMappingsError } = await supabase
            .from('region_category_mapping')
            .insert(mappings);

          if (insertMappingsError) throw insertMappingsError;
        }

        toast.success('Region updated successfully');
      } else {
        const { data: newRegion, error: insertError } = await supabase
          .from('regions')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (selectedCategories.length > 0 && newRegion) {
          const mappings = selectedCategories.map(category => ({
            region_id: newRegion.id,
            category_id: category.id
          }));

          const { error: mappingError } = await supabase
            .from('region_category_mapping')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }

        toast.success('Region created successfully');
      }

      handleClose();
      fetchRegions();
    } catch (error) {
      toast.error(editingRegion ? 'Error updating region' : 'Error creating region');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Regions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Region
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : regions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No regions found</TableCell>
              </TableRow>
            ) : (
              regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell>{region.name || '-'}</TableCell>
                  <TableCell>{region.code || '-'}</TableCell>
                  <TableCell>{region.city || '-'}</TableCell>
                  <TableCell>{region.country || '-'}</TableCell>
                  <TableCell>
                    {region.created_at ? new Date(region.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => handleOpen(region)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRegion ? 'Edit Region' : 'Add New Region'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Region Name"
                fullWidth
                value={formData.name}
                onChange={handleChange('name')}
                required
                disabled={!!editingRegion}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Region Code"
                fullWidth
                value={formData.code}
                onChange={handleChange('code')}
                required
                disabled={!!editingRegion}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Locale"
                fullWidth
                value={formData.locale}
                onChange={handleChange('locale')}
                disabled={!!editingRegion}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                fullWidth
                value={formData.city}
                onChange={handleChange('city')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Country"
                fullWidth
                value={formData.country}
                onChange={handleChange('country')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address 1"
                fullWidth
                value={formData.address_1}
                onChange={handleChange('address_1')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address 2"
                fullWidth
                value={formData.address_2}
                onChange={handleChange('address_2')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact No. 1"
                fullWidth
                value={formData.contact_no_1}
                onChange={handleChange('contact_no_1')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact No. 2"
                fullWidth
                value={formData.contact_no_2}
                onChange={handleChange('contact_no_2')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email 1"
                fullWidth
                value={formData.email_1}
                onChange={handleChange('email_1')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email 2"
                fullWidth
                value={formData.email_2}
                onChange={handleChange('email_2')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="WhatsApp No."
                fullWidth
                value={formData.whatsapp_no}
                onChange={handleChange('whatsapp_no')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Map URL"
                fullWidth
                value={formData.map_url}
                onChange={handleChange('map_url')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Icon URL"
                fullWidth
                value={formData.icon_url}
                onChange={handleChange('icon_url')}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enable_business_hours}
                    onChange={handleSwitchChange('enable_business_hours')}
                  />
                }
                label="Enable Business Hours"
              />
            </Grid>
            {formData.enable_business_hours && (
              <Grid item xs={12}>
                <TextField
                  label="Business Hours"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.business_hours}
                  onChange={handleChange('business_hours')}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Image URL 1"
                fullWidth
                value={formData.image_url_1}
                onChange={handleChange('image_url_1')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Image URL 2"
                fullWidth
                value={formData.image_url_2}
                onChange={handleChange('image_url_2')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Image URL 3"
                fullWidth
                value={formData.image_url_3}
                onChange={handleChange('image_url_3')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Image URL 4"
                fullWidth
                value={formData.image_url_4}
                onChange={handleChange('image_url_4')}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={categories}
                value={selectedCategories}
                onChange={(_, newValue) => setSelectedCategories(newValue)}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Categories"
                    placeholder="Select categories"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Saving...' : editingRegion ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
