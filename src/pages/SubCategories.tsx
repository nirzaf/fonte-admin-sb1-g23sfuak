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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Autocomplete,
  Chip,
  Tab,
  Tabs,
  Card,
  CardMedia,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { toast } from 'react-toastify';
import slugify from 'slugify';
import React from 'react';
import FilterSearch from '../components/FilterSearch';

interface Category {
  id: string;
  name: string;
}

interface DbRegion {
  id: number;
  name: string;
  code: string;
}

interface Region {
  id: string;
  name: string;
  code: string;
}

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  icon_url: string;
  category_id: string;
  order_index: number;
  category: Category;
  regions?: { id: string; name: string; code: string }[];
}

interface SubCategoryFormData {
  name: string;
  description: string;
  category_id: string;
  order_index: number;
  image?: File;
  icon?: File;
  image_url?: string;
  icon_url?: string;
  selectedRegions: Region[];
}

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<DbRegion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState(0);
  const [iconTab, setIconTab] = useState(0);
  const [formData, setFormData] = useState<SubCategoryFormData>({
    name: '',
    description: '',
    category_id: '',
    order_index: 0,
    selectedRegions: [],
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [filterCategory, setFilterCategory] = useState('');

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Error fetching categories');
      return;
    }

    setCategories(data);
  };

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

  const fetchSubCategories = async () => {
    const { data, error } = await supabase
      .from('sub_categories')
      .select(`
        *,
        category:categories (
          id,
          name
        ),
        region_subcategory_mapping (
          regions (
            id,
            name
          )
        )
      `)
      .order('order_index');

    if (error) {
      toast.error('Error fetching subcategories');
      return;
    }

    const subCategoriesWithRegions = data.map(subCategory => ({
      ...subCategory,
      regions: subCategory.region_subcategory_mapping
        ?.map((mapping: { regions: any; }) => mapping.regions)
        .filter((region: null) => region !== null)
    }));

    setSubCategories(subCategoriesWithRegions);
  };

  useEffect(() => {
    fetchCategories();
    fetchRegions();
    fetchSubCategories();
  }, []);

  useEffect(() => {
    let filtered = [...subCategories];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(subCategory => 
        subCategory.name.toLowerCase().includes(query) ||
        subCategory.description?.toLowerCase().includes(query) ||
        subCategory.category?.name.toLowerCase().includes(query)
      );
    }

    // Apply region filter
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(subCategory =>
        subCategory.regions?.some(region =>
          selectedRegions.some(sr => sr.id === region.id)
        )
      );
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(subCategory =>
        subCategory.category_id === filterCategory
      );
    }

    setFilteredSubCategories(filtered);
  }, [subCategories, searchQuery, selectedRegions, filterCategory]);

  const handleOpen = (subCategory?: SubCategory) => {
    if (subCategory) {
      setEditingId(subCategory.id);
      setFormData({
        name: subCategory.name,
        description: subCategory.description,
        category_id: subCategory.category_id,
        order_index: subCategory.order_index,
        image_url: subCategory.image_url,
        icon_url: subCategory.icon_url,
        selectedRegions: subCategory.regions?.map(r => ({
          id: String(r.id),
          name: r.name,
          code: r.code || ''
        })) || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        category_id: '',
        order_index: 0,
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
      category_id: '',
      order_index: 0,
      selectedRegions: [],
    });
    setImageTab(0);
    setIconTab(0);
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

      const subCategoryData = {
        name: formData.name,
        slug,
        description: formData.description,
        category_id: formData.category_id,
        order_index: formData.order_index,
        ...(image_url && { image_url }),
        ...(icon_url && { icon_url }),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('sub_categories')
          .update(subCategoryData)
          .eq('id', editingId);

        if (updateError) throw updateError;

        // Update region mappings
        await supabase
          .from('region_subcategory_mapping')
          .delete()
          .eq('subcategory_id', editingId);

        if (formData.selectedRegions.length > 0) {
          const mappings = formData.selectedRegions.map(region => ({
            subcategory_id: editingId,
            region_id: Number(region.id)
          }));

          const { error: mappingError } = await supabase
            .from('region_subcategory_mapping')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }

        toast.success('Subcategory updated successfully');
      } else {
        const { data: newSubCategory, error: insertError } = await supabase
          .from('sub_categories')
          .insert([subCategoryData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (formData.selectedRegions.length > 0 && newSubCategory) {
          const mappings = formData.selectedRegions.map(region => ({
            subcategory_id: newSubCategory.id,
            region_id: Number(region.id)
          }));

          const { error: mappingError } = await supabase
            .from('region_subcategory_mapping')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }

        toast.success('Subcategory created successfully');
      }

      handleClose();
      fetchSubCategories();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error saving subcategory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        // Delete region mappings first
        await supabase
          .from('region_subcategory_mapping')
          .delete()
          .eq('subcategory_id', id);

        // Then delete the subcategory
        const { error } = await supabase
          .from('sub_categories')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Subcategory deleted successfully');
        fetchSubCategories();
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error deleting subcategory');
      }
    }
  };

  const handleRegionChange = (newRegions: Region[]) => {
    const convertedRegions = newRegions.map(r => ({
      id: String(r.id),
      name: r.name,
      code: r.code || ''
    }));
    setSelectedRegions(convertedRegions);
  };

  // Convert database regions to component format
  const convertedRegions = regions.map(region => ({
    id: String(region.id),
    name: region.name,
    code: region.code || ''
  }));

  // Convert selected regions to component format
  const convertedSelectedRegions = selectedRegions.map(region => ({
    id: String(region.id),
    name: region.name,
    code: region.code || ''
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2 }}>
        <Typography variant="h4" component="h1">
          Subcategories
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Subcategory
        </Button>
      </Box>

      <Box sx={{ px: 2 }}>
        <FilterSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRegions={convertedSelectedRegions}
          onRegionChange={handleRegionChange}
          selectedCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          selectedSubCategory=""
          onSubCategoryChange={() => {}}
          regions={convertedRegions}
          categories={categories}
          subCategories={[]}
          showSubCategoryFilter={false}
        />

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={2}>
                  <Typography variant="subtitle2" color="textSecondary">
                    NAME
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Typography variant="subtitle2" color="textSecondary">
                    CATEGORY
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">
                    REGIONS
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Typography variant="subtitle2" color="textSecondary">
                    IMAGE
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Typography variant="subtitle2" color="textSecondary" align="right">
                    ACTIONS
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {filteredSubCategories.map((subCategory) => (
            <Grid item xs={12} key={subCategory.id}>
              <Card sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Typography variant="subtitle1">{subCategory.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Typography variant="body2" color="textSecondary">
                      {subCategory.category?.name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {subCategory.regions?.map((region) => (
                        <Chip
                          key={region.id}
                          label={region.name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    {subCategory.image_url && (
                      <Card sx={{ width: 60, height: 60 }}>
                        <CardMedia
                          component="img"
                          height="60"
                          image={subCategory.image_url}
                          alt={subCategory.name}
                        />
                      </Card>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Box display="flex" justifyContent="flex-end">
                      <IconButton onClick={() => handleOpen(subCategory)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(subCategory.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingId ? 'Edit Sub Category' : 'Add New Sub Category'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Parent Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    label="Parent Category"
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  id="regions"
                  options={convertedRegions}
                  value={formData.selectedRegions}
                  onChange={(_, newValue) => {
                    setFormData(prev => ({ ...prev, selectedRegions: newValue }));
                  }}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Regions"
                      placeholder="Select regions"
                    />
                  )}
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
                <Typography variant="subtitle1" gutterBottom>
                  Subcategory Image
                </Typography>
                <Tabs value={imageTab} onChange={(_, v) => setImageTab(v)}>
                  <Tab label="Upload" />
                  <Tab label="URL" />
                </Tabs>
                <Box sx={{ mt: 2 }}>
                  {imageTab === 0 ? (
                    <Box>
                    {/*}
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="subcategory-image"
                        type="file"
                        onChange={(e) => handleImageChange(e, 'image')}
                      />
                      
                      <label htmlFor="subcategory-image">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<ImageIcon />}
                        >
                          Choose Image
                        </Button>
                      </label>
                      */}
                      {(formData.image_url || formData.image) && (
                        <Card sx={{ mt: 2, maxWidth: 200 }}>
                          <CardMedia
                            component="img"
                            height="140"
                            image={formData.image ? URL.createObjectURL(formData.image) : formData.image_url}
                            alt="Subcategory image preview"
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
                  Subcategory Icon
                </Typography>
                <Tabs value={iconTab} onChange={(_, v) => setIconTab(v)}>
                  <Tab label="Upload" />
                  <Tab label="URL" />
                </Tabs>
                <Box sx={{ mt: 2 }}>
                  {iconTab === 0 ? (
                    <Box>
                    {/*}  <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="subcategory-icon"
                        type="file"
                        onChange={(e) => handleImageChange(e, 'icon')}
                      />
                      <label htmlFor="subcategory-icon">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<ImageIcon />}
                        >
                          Choose Icon
                        </Button>
                      </label>
                      */}
                      {(formData.icon_url || formData.icon) && (
                        <Card sx={{ mt: 2, maxWidth: 100 }}>
                          <CardMedia
                            component="img"
                            height="100"
                            image={formData.icon ? URL.createObjectURL(formData.icon) : formData.icon_url}
                            alt="Subcategory icon preview"
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
    </Box>
  );
}