import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, Button, CircularProgress } from '@mui/material';
import { Category, Inventory, Public, ViewList } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Email as EmailIcon } from '@mui/icons-material';
import { Badge } from '@mui/material';

interface DashboardCounts {
  categories: number;
  products: number;
  regions: number;
  subcategories: number;
  unreadMessages: number;
}

interface RegionProductCount {
  region_name: string;
  product_count: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCounts>({
    categories: 0,
    products: 0,
    regions: 0,
    subcategories: 0,
    unreadMessages: 0,
  });
  const [regionProducts, setRegionProducts] = useState<RegionProductCount[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Get categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact' });

      // Get subcategories count
      const { count: subcategoriesCount } = await supabase
        .from('sub_categories')
        .select('*', { count: 'exact' });

      // Get regions count
      const { count: regionsCount } = await supabase
        .from('regions')
        .select('*', { count: 'exact' });

      // Get unread messages count
      const { count: unreadCount } = await supabase
        .from('contactus_response')
        .select('*', { count: 'exact' })
        .eq('mark_as_read', false);

      // Get products by category
      const { error: categoryError } = await supabase
        .from('products')
        .select(`
          subcategory:sub_categories (
            category:categories (
              id,
              name
            )
          )
        `);

      if (categoryError) throw categoryError;

      // Process products by category data

      // Get products by region
      const { data: productsByRegion, error: regionError } = await supabase
        .from('region_product_mapping')
        .select(`
          region:regions (
            id,
            name
          )
        `);

      if (regionError) throw regionError;

      // Process products by region data
      const regionStats = productsByRegion.reduce((acc: Record<string, number>, mapping: any) => {
        const regionName = mapping.region?.name;
        if (regionName) {
          acc[regionName] = (acc[regionName] || 0) + 1;
        }
        return acc;
      }, {});

      setCounts({
        categories: categoriesCount || 0,
        products: productsCount || 0,
        regions: regionsCount || 0,
        subcategories: subcategoriesCount || 0,
        unreadMessages: unreadCount || 0,
      });

      const formattedRegionData = Object.keys(regionStats).map(regionName => ({
        region_name: regionName,
        product_count: regionStats[regionName]
      }));

      setRegionProducts(formattedRegionData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Categories',
      value: counts.categories,
      icon: <Category sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      path: '/categories'
    },
    {
      title: 'Total Products',
      value: counts.products,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      path: '/products'
    },
    {
      title: 'Total Regions',
      value: counts.regions,
      icon: <Public sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      path: '/regions'
    },
    {
      title: 'Total Subcategories',
      value: counts.subcategories,
      icon: <ViewList sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      path: '/subcategories'
    },
    {
      title: 'Messages',
      value: counts.unreadMessages,
      icon: <EmailIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      path: '/messages'
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            {index === 4 ? (
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(stat.path)}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Badge badgeContent={stat.value} color="error">
                      {stat.icon}
                    </Badge>
                  </Box>
                  <Typography variant="h5">
                    {stat.value} unread
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
                onClick={() => navigate(stat.path)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        bgcolor: stat.color,
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Box ml={2}>
                      <Typography variant="h4" component="div">
                        {stat.value}
                      </Typography>
                      <Typography color="textSecondary">
                        {stat.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(stat.path);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Products by Region
        </Typography>
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={regionProducts}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="product_count" name="Number of Products" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}