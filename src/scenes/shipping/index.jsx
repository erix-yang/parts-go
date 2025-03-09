import { Box, Button, IconButton, Typography, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, useMediaQuery } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingIcon from '@mui/icons-material/Pending';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import imageCompression from 'browser-image-compression';

const Shipping = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  const [shippingData, setShippingData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driver: '',
    invoice: '',
    task: 'Drop Off',
    shop_name: '',
    status: 'Pending',
    shop_addr: '',
    addr_longitude: '',
    addr_latitude: '',
    delivery_image_path: ''
  });
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [currentImage, setCurrentImage] = useState('');

  useEffect(() => {
    getShippingData();
  }, []);

  const getShippingData = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setShippingData(data);
    } catch (error) {
      console.error('Error fetching shipping data:', error.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdd = () => {
    setDialogMode('add');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      driver: '',
      invoice: '',
      task: 'Drop Off',
      shop_name: '',
      status: 'Pending',
      shop_addr: '',
      addr_longitude: '',
      addr_latitude: '',
      delivery_image_path: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (shipping) => {
    setDialogMode('edit');
    setSelectedShipping(shipping);
    setFormData({
      date: shipping.date ? new Date(shipping.date).toISOString().split('T')[0] : '',
      driver: shipping.driver || '',
      invoice: shipping.invoice || '',
      task: shipping.task || 'Drop Off',
      shop_name: shipping.shop_name || '',
      status: shipping.status || 'Pending',
      shop_addr: shipping.shop_addr || '',
      addr_longitude: shipping.addr_longitude || '',
      addr_latitude: shipping.addr_latitude || '',
      delivery_image_path: shipping.delivery_image_path || ''
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shipping entry?')) {
      try {
        const { error } = await supabase
          .from('shipping')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        await getShippingData();
      } catch (error) {
        console.error('Error deleting shipping:', error.message);
        alert('Error deleting shipping entry');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('shipping')
          .insert([formData]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shipping')
          .update(formData)
          .eq('id', selectedShipping.id);
        
        if (error) throw error;
      }
      
      setOpenDialog(false);
      await getShippingData();
    } catch (error) {
      console.error('Error saving shipping:', error.message);
      alert('Error saving shipping entry');
    }
  };

  const handleDelivered = async (shipping) => {
    try {
      fileInputRef.current.click();
      fileInputRef.current.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 压缩图像
        const options = {
          maxSizeMB: 1, // 最大文件大小（MB）
          maxWidthOrHeight: 1920, // 最大宽度或高度
          useWebWorker: true, // 使用 Web Worker
        };

        try {
          const compressedFile = await imageCompression(file, options);
          console.log("Compressed file:", compressedFile);

          // 上传压缩后的图像
          const fileExt = compressedFile.name.split('.').pop();
          const fileName = `${shipping.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('delivery-images')
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;

          // 更新送货记录
          const { error: updateError } = await supabase
            .from('shipping')
            .update({
              status: 'Delivered',
              delivery_image_path: fileName
            })
            .eq('id', shipping.id);

          if (updateError) throw updateError;

          await getShippingData();
        } catch (compressionError) {
          console.error('Error compressing image:', compressionError.message);
          alert('Error compressing image');
        }
      };
    } catch (error) {
      console.error('Error marking as delivered:', error.message);
      alert('Error marking as delivered');
    }
  };

  const viewImage = async (path) => {
    if (!path) return;

    try {
      const { data, error } = await supabase.storage
        .from('delivery-images')
        .getPublicUrl(path);

      if (error) throw error;
      
      setCurrentImage(data.publicUrl);
      setShowImageDialog(true);
    } catch (error) {
      console.error('Error getting image:', error.message);
      alert('Error retrieving image');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircleIcon style={{ color: 'green' }} />;
      case 'In Transit':
        return <LocalShippingIcon style={{ color: 'blue' }} />;
      default:
        return <PendingIcon style={{ color: 'orange' }} />;
    }
  };

  const columns = [
    { field: "id", headerName: "ID", flex: 0.5 },
    { 
      field: "date", 
      headerName: "Date", 
      flex: 1,
      type: 'date',
      valueGetter: (params) => new Date(params.value),
    },
    { field: "driver", headerName: "Driver", flex: 1 },
    { field: "invoice", headerName: "Invoice", flex: 1 },
    { field: "task", headerName: "Task", flex: 1 },
    { field: "shop_name", headerName: "Shop Name", flex: 1.5 },
    { 
      field: "status", 
      headerName: "Status", 
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          {getStatusIcon(params.value)}
          <Typography sx={{ ml: 1 }}>{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: "actions", 
      headerName: "Actions", 
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" justifyContent="center" gap={1}>
          <IconButton onClick={() => handleEdit(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
          <IconButton 
            onClick={() => handleDelivered(params.row)}
            disabled={params.row.status === 'Delivered'}
          >
            <DirectionsCarIcon />
          </IconButton>
          {params.row.delivery_image_path && (
            <IconButton onClick={() => viewImage(params.row.delivery_image_path)}>
              <CameraAltIcon />
            </IconButton>
          )}
        </Box>
      )
    },
  ];

  // Mobile card view renderer
  const renderMobileCards = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {shippingData.map((shipping) => (
          <Card key={shipping.id} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {shipping.shop_name}
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                {getStatusIcon(shipping.status)}
                <Typography variant="body1" sx={{ ml: 1 }}>
                  {shipping.status}
                </Typography>
              </Box>
              <Typography variant="body2" color={colors.grey[300]}>
                Date: {new Date(shipping.date).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                Driver: {shipping.driver}
              </Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                Invoice: {shipping.invoice}
              </Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                Task: {shipping.task}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <LocationOnIcon fontSize="small" />
                <Typography variant="body2" color={colors.grey[300]} sx={{ ml: 1 }}>
                  {shipping.shop_addr}
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <IconButton onClick={() => handleEdit(shipping)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(shipping.id)}>
                <DeleteIcon />
              </IconButton>
              <IconButton 
                onClick={() => handleDelivered(shipping)}
                disabled={shipping.status === 'Delivered'}
              >
                <DirectionsCarIcon />
              </IconButton>
              {shipping.delivery_image_path && (
                <IconButton onClick={() => viewImage(shipping.delivery_image_path)}>
                  <CameraAltIcon />
                </IconButton>
              )}
            </CardActions>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Box m="20px">
      <Header title="SHIPPING" subtitle="Manage Shipping Tasks" />
      
      <Box display="flex" justifyContent="flex-end" mb={2}>
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
          Add New Shipping
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
            rows={shippingData}
            columns={columns}
            components={{ Toolbar: GridToolbar }}
          />
        )}
      </Box>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Shipping' : 'Edit Shipping'}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              '& .MuiTextField-root': { m: 1, width: isMobile ? '100%' : '47%' },
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              name="date"
              label="Date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              name="driver"
              label="Driver"
              value={formData.driver}
              onChange={handleInputChange}
            />
            <TextField
              name="invoice"
              label="Invoice"
              value={formData.invoice}
              onChange={handleInputChange}
            />
            <FormControl sx={{ m: 1, width: isMobile ? '100%' : '47%' }}>
              <InputLabel>Task</InputLabel>
              <Select
                name="task"
                value={formData.task}
                label="Task"
                onChange={handleInputChange}
              >
                <MenuItem value="Drop Off">Drop Off</MenuItem>
                <MenuItem value="Pick Up Return">Pick Up Return</MenuItem>
                <MenuItem value="Pick Up Core">Pick Up Core</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="shop_name"
              label="Shop Name"
              value={formData.shop_name}
              onChange={handleInputChange}
              required
            />
            <FormControl sx={{ m: 1, width: isMobile ? '100%' : '47%' }}>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleInputChange}
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Transit">In Transit</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="shop_addr"
              label="Shop Address"
              value={formData.shop_addr}
              onChange={handleInputChange}
              fullWidth
              sx={{ m: 1 }}
            />
            <TextField
              name="addr_longitude"
              label="Longitude"
              type="number"
              value={formData.addr_longitude}
              onChange={handleInputChange}
            />
            <TextField
              name="addr_latitude"
              label="Latitude"
              type="number"
              value={formData.addr_latitude}
              onChange={handleInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageDialog} onClose={() => setShowImageDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <img src={currentImage} style={{ width: '100%', height: 'auto' }} alt="Delivery" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImageDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shipping;
