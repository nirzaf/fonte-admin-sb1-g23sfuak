import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Category, Inventory, Public } from '@mui/icons-material';
import { supabase } from '../lib/supabase';

interface DashboardCounts {
  categories: number;
  products: number;
  regions: number;
}

export default function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts>({
    categories: 0,
    products: 0,
    regions: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const [
        { count: categoriesCount },
        { count: productsCount },
        { count: regionsCount },
      ] = await Promise.all([
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('regions').select('*', { count: 'exact', head: true }),
      ]);

      setCounts({
        categories: categoriesCount || 0,
        products: productsCount || 0,
        regions: regionsCount || 0,
      });
    };

    fetchCounts();
  }, []);

  const stats = [
    {
      title: 'Total Categories',
      value: counts.categories,
      icon: <Category sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Total Products',
      value: counts.products,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Total Regions',
      value: counts.regions,
      icon: <Public sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={4} key={stat.title}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: stat.color,
                color: 'white',
              }}
            >
              {stat.icon}
              <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                {stat.value}
              </Typography>
              <Typography variant="subtitle1">{stat.title}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}