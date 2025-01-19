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
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { toast } from 'react-toastify';
import slugify from 'slugify';

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  icon_url: string;
  category_id: string;
  order_position: number;
  category: Category;
}

interface SubCategoryFormData {
  name: string;
  description: string;
  category_id: string;
  order_position: number;
  image?: File;
  icon?: File;
}

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubCategoryFormData>({
    name: '',
    description: '',
    category_id: '',
    order_position: 0,
  });

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

  const fetchSubCategories = async () => {
    const { data, error } = await supabase
      .from('sub_categories')
      .select(`
        *,
        category:categories (
          id,
          name
        )
      `)
      .order('order_position');

    if (error) {
      toast.error('Error fetching subcategories');
      return;
    }

    setSubCategories(data);
  };

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
  }, []);

  const handleOpen = (subCategory?: SubCategory) => {
    if (subCategory) {
      setEditingId(subCategory.id);
      setFormData({
        name: subCategory.name,
        description: subCategory.description,
        category_id: subCategory.category_id,
        order_position: subCategory.order_position,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        category_id: '',
        order_position: 0,
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
      order_position: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = slugify(formData.name, { lower: true });
      let image_url = '';
      let icon_url = '';

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
        order_position: formData.order_position,
        ...(image_url && { image_url }),
        ...(icon_url && { icon_url }),
      };

      if (editingId) {
        const { error } = await supabase
          .from('sub_categories')
          .update(subCategoryData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Subcategory updated successfully');
      } else {
        const { error } = await supabase
          .from('sub_categories')
          .insert([subCategoryData]);

        if (error) throw error;
        toast.success('Subcategory created successfully');
      }

      handleClose();
      fetchSubCategories();
    } catch (error) {
      toast.error('Error saving subcategory');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      const { error } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Error deleting subcategory');
        return;
      }

      toast.success('Subcategory deleted successfully');
      fetchSubCategories();
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { 
      field: 'category',
      headerName: 'Category',
      flex: 1,
      valueGetter: (params) => params.row.category?.name || 'N/A',
    },
    { field: 'description', headerName: 'Description', flex: 2 },
    { field: 'order_position', headerName: 'Order', width: 100 },
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
        <Typography variant="h4">Sub Categories</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Sub Category
        </Button>
      </Box>

      <DataGrid
        rows={subCategories}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 20, 50]}
        autoHeight
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Sub Category' : 'Add New Sub Category'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
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
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category_id}
                label="Category"
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <TextField
              fullWidth
              label="Order Position"
              type="number"
              value={formData.order_position}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order_position: parseInt(e.target.value) || 0,
                })
              }
              margin="normal"
            />
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
            <TextField
              fullWidth
              type="file"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  icon: e.target.files ? e.target.files[0] : undefined,
                })
              }
              margin="normal"
              InputLabelProps={{ shrink: true }}
              label="Icon"
            />
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