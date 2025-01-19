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
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { toast } from 'react-toastify';
import slugify from 'slugify';

interface SubCategory {
  id: string;
  name: string;
}

interface Region {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  subcategory_id: string;
  price: number;
  is_active: boolean;
  reference: string;
  composition: string;
  technique: string;
  width: string;
  weight: string;
  martindale: string;
  repeats: string;
  end_use: string;
  subcategory: SubCategory;
  region_product_mappings: { region: Region }[];
}

interface ProductFormData {
  name: string;
  description: string;
  subcategory_id: string;
  price: string;
  is_active: boolean;
  reference: string;
  composition: string;
  technique: string;
  width: string;
  weight: string;
  martindale: string;
  repeats: string;
  end_use: string;
  image?: File;
  region_ids: string[];
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    subcategory_id: '',
    price: '',
    is_active: true,
    reference: '',
    composition: '',
    technique: '',
    width: '',
    weight: '',
    martindale: '',
    repeats: '',
    end_use: '',
    region_ids: [],
  });

  const fetchSubCategories = async () => {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Error fetching subcategories');
      return;
    }

    setSubCategories(data);
  };

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('regions')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Error fetching regions');
      return;
    }

    setRegions(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        subcategory:sub_categories (
          id,
          name
        ),
        region_product_mappings (
          region:regions (
            id,
            name
          )
        )
      `)
      .order('name');

    if (error) {
      toast.error('Error fetching products');
      return;
    }

    setProducts(data);
  };

  useEffect(() => {
    fetchSubCategories();
    fetchRegions();
    fetchProducts();
  }, []);

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        description: product.description,
        subcategory_id: product.subcategory_id,
        price: product.price?.toString() || '',
        is_active: product.is_active,
        reference: product.reference || '',
        composition: product.composition || '',
        technique: product.technique || '',
        width: product.width || '',
        weight: product.weight || '',
        martindale: product.martindale || '',
        repeats: product.repeats || '',
        end_use: product.end_use || '',
        region_ids: product.region_product_mappings.map(rpm => rpm.region.id),
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        subcategory_id: '',
        price: '',
        is_active: true,
        reference: '',
        composition: '',
        technique: '',
        width: '',
        weight: '',
        martindale: '',
        repeats: '',
        end_use: '',
        region_ids: [],
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
      subcategory_id: '',
      price: '',
      is_active: true,
      reference: '',
      composition: '',
      technique: '',
      width: '',
      weight: '',
      martindale: '',
      repeats: '',
      end_use: '',
      region_ids: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = slugify(formData.name, { lower: true });
      let image_url = '';

      if (formData.image) {
        image_url = await uploadImage(formData.image);
      }

      const productData = {
        name: formData.name,
        slug,
        description: formData.description,
        subcategory_id: formData.subcategory_id,
        price: formData.price ? parseFloat(formData.price) : null,
        is_active: formData.is_active,
        reference: formData.reference,
        composition: formData.composition,
        technique: formData.technique,
        width: formData.width,
        weight: formData.weight,
        martindale: formData.martindale,
        repeats: formData.repeats,
        end_use: formData.end_use,
        ...(image_url && { image_url }),
      };

      let productId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select();

        if (error) throw error;
        if (data) productId = data[0].id;
        toast.success('Product created successfully');
      }

      // Handle region mappings
      if (productId) {
        // Delete existing mappings
        await supabase
          .from('region_product_mappings')
          .delete()
          .eq('product_id', productId);

        // Insert new mappings
        if (formData.region_ids.length > 0) {
          const mappings = formData.region_ids.map(region_id => ({
            region_id,
            product_id: productId,
          }));

          const { error } = await supabase
            .from('region_product_mappings')
            .insert(mappings);

          if (error) throw error;
        }
      }

      handleClose();
      fetchProducts();
    } catch (error) {
      toast.error('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Error deleting product');
        return;
      }

      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { 
      field: 'subcategory',
      headerName: 'Sub Category',
      flex: 1,
      valueGetter: (params) => params.row.subcategory?.name || 'N/A',
    },
    { field: 'price', headerName: 'Price', width: 100 },
    { 
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      type: 'boolean',
    },
    { 
      field: 'regions',
      headerName: 'Regions',
      flex: 1,
      valueGetter: (params) => 
        params.row.region_product_mappings
          ?.map((rpm: any) => rpm.region.name)
          .join(', ') || 'N/A',
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Product
        </Button>
      </Box>

      <DataGrid
        rows={products}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 20, 50]}
        autoHeight
      />

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Sub Category</InputLabel>
                  <Select
                    value={formData.subcategory_id}
                    label="Sub Category"
                    onChange={(e) =>
                      setFormData({ ...formData, subcategory_id: e.target.value })
                    }
                  >
                    {subCategories.map((subCategory) => (
                      <MenuItem key={subCategory.id} value={subCategory.id}>
                        {subCategory.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                    />
                  }
                  label="Active"
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Composition"
                  value={formData.composition}
                  onChange={(e) =>
                    setFormData({ ...formData, composition: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Technique"
                  value={formData.technique}
                  onChange={(e) =>
                    setFormData({ ...formData, technique: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Width"
                  value={formData.width}
                  onChange={(e) =>
                    setFormData({ ...formData, width: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Weight"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Martindale"
                  value={formData.martindale}
                  onChange={(e) =>
                    setFormData({ ...formData, martindale: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Repeats"
                  value={formData.repeats}
                  onChange={(e) =>
                    setFormData({ ...formData, repeats: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="End Use"
                  value={formData.end_use}
                  onChange={(e) =>
                    setFormData({ ...formData, end_use: e.target.value })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="file"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      image: e.target.files ? e.target.files[0] : undefined,
                    })
                  }
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  label="Image"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Regions</InputLabel>
                  <Select
                    multiple
                    value={formData.region_ids}
                    label="Regions"
                    onChange={(e) => {
                      const value = e.target.value as string[];
                      setFormData({ ...formData, region_ids: value });
                    }}
                  >
                    {regions.map((region) => (
                      <MenuItem key={region.id} value={region.id}>
                        {region.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}