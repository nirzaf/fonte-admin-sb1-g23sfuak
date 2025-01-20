import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

interface Region {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  category_id: string;
}

interface FilterSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRegions: Region[];
  onRegionChange: (regions: Region[]) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  selectedSubCategory: string;
  onSubCategoryChange: (subCategoryId: string) => void;
  regions: Region[];
  categories: Category[];
  subCategories: SubCategory[];
  showSubCategoryFilter?: boolean;
}

const FilterSearch: React.FC<FilterSearchProps> = ({
  searchQuery,
  onSearchChange,
  selectedRegions,
  onRegionChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  regions,
  categories,
  subCategories,
  showSubCategoryFilter = true,
}) => {
  const filteredSubCategories = React.useMemo(() => {
    if (!selectedCategory) return subCategories;
    return subCategories.filter(sc => sc.category_id === selectedCategory);
  }, [selectedCategory, subCategories]);

  const handleClearFilters = () => {
    onSearchChange('');
    onRegionChange([]);
    onCategoryChange('');
    onSubCategoryChange('');
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }} elevation={0}>
      <Stack spacing={2}>
        {/* Search Bar */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Filter by Region</InputLabel>
            <Select
              multiple
              value={selectedRegions.map(r => r.id)}
              label="Filter by Region"
              onChange={(e) => {
                const value = e.target.value as string[];
                onRegionChange(regions.filter(r => value.includes(r.id)));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const region = regions.find(r => r.id === value);
                    return region ? (
                      <Chip key={value} label={region.name} size="small" />
                    ) : null;
                  })}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 224,
                  },
                },
              }}
            >
              {regions.map((region) => (
                <MenuItem key={region.id} value={region.id}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => onCategoryChange(e.target.value)}
              displayEmpty
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 224,
                  },
                },
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showSubCategoryFilter && (
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Subcategory</InputLabel>
              <Select
                value={selectedSubCategory}
                label="Subcategory"
                onChange={(e) => onSubCategoryChange(e.target.value)}
                displayEmpty
                disabled={!selectedCategory}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                    },
                  },
                }}
              >
                <MenuItem value="">All Subcategories</MenuItem>
                {filteredSubCategories.map((subCategory) => (
                  <MenuItem key={subCategory.id} value={subCategory.id}>
                    {subCategory.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(searchQuery || selectedRegions.length > 0 || selectedCategory || selectedSubCategory) && (
            <IconButton 
              onClick={handleClearFilters}
              color="primary"
              size="small"
              sx={{ mt: 0.5 }}
            >
              <ClearIcon />
            </IconButton>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default FilterSearch;
