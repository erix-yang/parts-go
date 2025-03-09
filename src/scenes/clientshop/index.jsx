import { Box, Button, IconButton, Typography, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LinkIcon from '@mui/icons-material/Link';
import MapIcon from '@mui/icons-material/Map';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ClientShop = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [shopData, setShopData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedShop, setSelectedShop] = useState(null);
  const [formData, setFormData] = useState({
    shop_name: '',
    gmap_link: '',
    longitude: '',
    latitude: ''
  });
  const [openMapDialog, setOpenMapDialog] = useState(false);

  useEffect(() => {
    getShopData();
  }, []);

  const getShopData = async () => {
    try {
      const { data, error } = await supabase
        .from('clientshop')
        .select('*')
        .order('shop_name');
      
      if (error) throw error;
      setShopData(data);
    } catch (error) {
      console.error('Error fetching shop data:', error.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const extractCoordinates = (gmapLink) => {
    try {
      let latitude = null;
      let longitude = null;

      const latMatch = gmapLink.match(/!3d(-?\d+\.\d+)/);
      const lngMatch = gmapLink.match(/!4d(-?\d+\.\d+)/);
      
      if (latMatch && lngMatch) {
        latitude = parseFloat(latMatch[1]);
        longitude = parseFloat(lngMatch[1]);
      }
      
      if (!latitude || !longitude) {
        const atMatch = gmapLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
          latitude = parseFloat(atMatch[1]);
          longitude = parseFloat(atMatch[2]);
        }
      }

      return { latitude, longitude };
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return { latitude: null, longitude: null };
    }
  };

  const handleAdd = () => {
    setDialogMode('add');
    setFormData({
      shop_name: '',
      gmap_link: '',
      longitude: '',
      latitude: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (shop) => {
    setDialogMode('edit');
    setSelectedShop(shop);
    setFormData({
      shop_name: shop.shop_name || '',
      gmap_link: shop.gmap_link || '',
      longitude: shop.longitude || '',
      latitude: shop.latitude || ''
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shop?')) {
      try {
        const { error } = await supabase
          .from('clientshop')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        await getShopData();
      } catch (error) {
        console.error('Error deleting shop:', error.message);
        alert('Error deleting shop');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const { latitude, longitude } = extractCoordinates(formData.gmap_link);
      
      const dataToSubmit = {
        shop_name: formData.shop_name,
        gmap_link: formData.gmap_link,
        latitude: latitude,
        longitude: longitude
      };
      
      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('clientshop')
          .insert([dataToSubmit]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientshop')
          .update(dataToSubmit)
          .eq('id', selectedShop.id);
        
        if (error) throw error;
      }
      
      setOpenDialog(false);
      await getShopData();
    } catch (error) {
      console.error('Error saving shop:', error.message);
      alert('Error saving shop');
    }
  };

  const openGmapLink = (link) => {
    if (link) {
      window.open(link, '_blank');
    }
  };

  const calculateMapCenter = () => {
    if (shopData.length === 0) return [49.2827, -123.1207];

    const validShops = shopData.filter(shop => 
      shop.latitude && shop.longitude && 
      !isNaN(shop.latitude) && !isNaN(shop.longitude)
    );
    
    if (validShops.length === 0) return [49.2827, -123.1207];

    const sumLat = validShops.reduce((sum, shop) => sum + parseFloat(shop.latitude), 0);
    const sumLng = validShops.reduce((sum, shop) => sum + parseFloat(shop.longitude), 0);
    
    return [sumLat / validShops.length, sumLng / validShops.length];
  };

  const handleOpenMap = () => {
    setOpenMapDialog(true);
  };

  const columns = [
    { field: "id", headerName: "ID", flex: 0.5 },
    { field: "shop_name", headerName: "Shop Name", flex: 1.5 },
    { 
      field: "gmap_link", 
      headerName: "Google Maps", 
      flex: 0.8,
      renderCell: (params) => (
        <IconButton onClick={() => openGmapLink(params.value)}>
          <LinkIcon />
        </IconButton>
      )
    },
    { field: "longitude", headerName: "Longitude", flex: 1 },
    { field: "latitude", headerName: "Latitude", flex: 1 },
    { 
      field: "actions", 
      headerName: "Actions", 
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" justifyContent="center" gap={1}>
          <IconButton onClick={() => handleEdit(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    },
  ];

  const renderMobileCards = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {shopData.map((shop) => (
          <Card key={shop.id} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {shop.shop_name}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <LocationOnIcon fontSize="small" />
                <Typography variant="body2" color={colors.grey[300]} sx={{ ml: 1 }}>
                  Lat: {shop.latitude}, Lng: {shop.longitude}
                </Typography>
              </Box>
              <Box mt={1}>
                <Button 
                  startIcon={<LinkIcon />} 
                  onClick={() => openGmapLink(shop.gmap_link)}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Open in Maps
                </Button>
              </Box>
            </CardContent>
            <CardActions>
              <IconButton onClick={() => handleEdit(shop)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(shop.id)}>
                <DeleteIcon />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Box m="20px">
      <Header title="CLIENT SHOPS" subtitle="Manage Client Shop Locations" />
      
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Button
          variant="contained"
          startIcon={<MapIcon />}
          onClick={handleOpenMap}
          sx={{
            backgroundColor: colors.greenAccent[600],
            color: colors.grey[100],
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
          }}
        >
          View Shops in Map
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{
            backgroundColor: colors.blueAccent[600],
            color: colors.grey[100],
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
          }}
        >
          Add New Shop
        </Button>
      </Box>

      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
          "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
            color: `${colors.grey[100]} !important`,
          },
        }}
      >
        {isMobile ? (
          renderMobileCards()
        ) : (
          <DataGrid
            rows={shopData}
            columns={columns}
            components={{ Toolbar: GridToolbar }}
          />
        )}
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Shop' : 'Edit Shop'}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              '& .MuiTextField-root': { m: 1, width: isMobile ? '100%' : '97%' },
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              name="shop_name"
              label="Shop Name"
              value={formData.shop_name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              name="gmap_link"
              label="Google Maps Link"
              value={formData.gmap_link}
              onChange={handleInputChange}
              helperText="Paste Google Maps link here. Make sure you maximize the map to get the accurate coordinates."
              fullWidth
              multiline
              maxRows={4}
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', m: 1, mb: 2 }}>
              Coordinates will be extracted automatically from the Google Maps link.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openMapDialog} 
        onClose={() => setOpenMapDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Shop Locations
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: '70vh', width: '100%' }}>
            <MapContainer 
              center={calculateMapCenter()} 
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {shopData.filter(shop => shop.latitude && shop.longitude && !isNaN(shop.latitude) && !isNaN(shop.longitude)).map(shop => (
                <Marker 
                  key={shop.id} 
                  position={[parseFloat(shop.latitude), parseFloat(shop.longitude)]}
                >
                  <Popup>
                    <div>
                      <h3>{shop.shop_name}</h3>
                      <p>Latitude: {shop.latitude}</p>
                      <p>Longitude: {shop.longitude}</p>
                      <button onClick={() => openGmapLink(shop.gmap_link)}>
                        Open in Google Maps
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMapDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientShop;
