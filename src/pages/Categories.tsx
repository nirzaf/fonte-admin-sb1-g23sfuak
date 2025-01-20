import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Autocomplete,
  Tab,
  Tabs,
  Card,
  CardMedia,
  CardActionArea,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { toast } from 'react-toastify';
import slugify from 'slugify';
import React from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  order_index: number;
  icon_url?: string;
  regions?: { id: number; name: string }[];
}

interface CategoryFormData {
  name: string;
  description: string;
  order_position: number;
  image?: File;
  icon?: File;
  image_url?: string;
  icon_url?: string;
  selectedRegions: { id: number; name: string }[];
}

interface Region {
  id: number;
  name: string;
  code: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState(0);
  const [iconTab, setIconTab] = useState(0);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    order_position: 0,
    selectedRegions: [],
  });

  useEffect(() => {
    fetchCategories();
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Failed to fetch regions');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          region_category_mapping (
            regions (
              id,
              name
            )
          )
        `)
        .order('order_index');

      if (error) {
        toast.error('Error fetching categories');
        return;
      }

      const categoriesWithRegions = data.map(category => ({
        ...category,
        regions: category.region_category_mapping
          ?.map(mapping => mapping.regions)
          .filter(region => region !== null)
      }));

      setCategories(categoriesWithRegions);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOpen = (category?: Category) => {
    if (category) {
      setEditingId(category.id);
      setFormData({
        name: category.name,
        description: category.description || '',
        order_position: category.order_index,
        image_url: category.image_url,
        icon_url: category.icon_url,
        selectedRegions: category.regions || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        order_position: 0,
        selectedRegions: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      order_position: 0,
      selectedRegions: [],
    });
    setImageTab(0);
    setIconTab(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = slugify(formData.name, { lower: true });
      let image_url = formData.image_url || '';
      let icon_url = formData.icon_url || '';

      if (formData.image) {
        image_url = await uploadImage(formData.image);
      }

      if (formData.icon) {
        icon_url = await uploadImage(formData.icon);
      }

      const categoryData = {
        name: formData.name,
        slug,
        description: formData.description,
        order_index: formData.order_position,
        ...(image_url && { image_url }),
        ...(icon_url && { icon_url }),
      };

      if (editingId) {
        // Update category
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingId);

        if (updateError) throw updateError;

        // Update region mappings
        await supabase
          .from('region_category_mapping')
          .delete()
          .eq('category_id', editingId);

        if (formData.selectedRegions.length > 0) {
          const mappings = formData.selectedRegions.map(region => ({
            category_id: editingId,
            region_id: region.id
          }));

          const { error: mappingError } = await supabase
            .from('region_category_mapping')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }

        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { data: newCategory, error: insertError } = await supabase
          .from('categories')
          .insert([categoryData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (formData.selectedRegions.length > 0 && newCategory) {
          const mappings = formData.selectedRegions.map(region => ({
            category_id: newCategory.id,
            region_id: region.id
          }));

          const { error: mappingError } = await supabase
            .from('region_category_mapping')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }

        toast.success('Category created successfully');
      }

      handleClose();
      fetchCategories();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error saving category');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'icon') => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [type]: file,
      }));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Error deleting category');
        return;
      }

      toast.success('Category deleted successfully');
      fetchCategories();
    }
  };

  const columns: any[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 2 },
    { field: 'order_index', headerName: 'Order', width: 100 },
    {
      field: 'regions',
      headerName: 'Regions',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value.map(region => (
            <Chip
              key={region.id}
              label={region.name}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleOpen(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Categories</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Category
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Regions</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.description || '-'}</TableCell>
                <TableCell>{category.order_index}</TableCell>
                <TableCell>
                  {category.regions && category.regions.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {category.regions.map(region => (
                        <Chip
                          key={region.id}
                          label={region.name}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(category)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(category.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Category Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={regions}
                value={formData.selectedRegions}
                onChange={(_, newValue) => setFormData(prev => ({ ...prev, selectedRegions: newValue }))}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Associated Regions"
                    placeholder="Select regions"
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

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Category Image
              </Typography>
              <Tabs value={imageTab} onChange={(_, v) => setImageTab(v)}>
                <Tab label="Upload" />
                <Tab label="URL" />
              </Tabs>
              <Box sx={{ mt: 2 }}>
                {imageTab === 0 ? (
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="category-image"
                      type="file"
                      onChange={(e) => handleImageChange(e, 'image')}
                    />
                    <label htmlFor="category-image">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<ImageIcon />}
                      >
                        Choose Image
                      </Button>
                    </label>
                    {(formData.image_url || formData.image) && (
                      <Card sx={{ mt: 2, maxWidth: 200 }}>
                        <CardMedia
                          component="img"
                          height="140"
                          image={formData.image ? URL.createObjectURL(formData.image) : formData.image_url}
                          alt="Category image preview"
                        />
                      </Card>
                    )}
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    label="Image URL"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    InputProps={{
                      endAdornment: formData.image_url && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => window.open(formData.image_url, '_blank')}>
                            <ImageIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Category Icon
              </Typography>
              <Tabs value={iconTab} onChange={(_, v) => setIconTab(v)}>
                <Tab label="Upload" />
                <Tab label="URL" />
              </Tabs>
              <Box sx={{ mt: 2 }}>
                {iconTab === 0 ? (
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="category-icon"
                      type="file"
                      onChange={(e) => handleImageChange(e, 'icon')}
                    />
                    <label htmlFor="category-icon">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<ImageIcon />}
                      >
                        Choose Icon
                      </Button>
                    </label>
                    {(formData.icon_url || formData.icon) && (
                      <Card sx={{ mt: 2, maxWidth: 100 }}>
                        <CardMedia
                          component="img"
                          height="100"
                          image={formData.icon ? URL.createObjectURL(formData.icon) : formData.icon_url}
                          alt="Category icon preview"
                        />
                      </Card>
                    )}
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    label="Icon URL"
                    value={formData.icon_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon_url: e.target.value }))}
                    InputProps={{
                      endAdornment: formData.icon_url && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => window.open(formData.icon_url, '_blank')}>
                            <ImageIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>
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
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}