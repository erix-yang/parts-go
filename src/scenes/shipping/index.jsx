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
import LinkIcon from '@mui/icons-material/Link';
import MapIcon from '@mui/icons-material/Map';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import imageCompression from 'browser-image-compression';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// 修复 Leaflet 图标问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Shipping = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  const [shippingData, setShippingData] = useState([]);
  const [filteredShippingData, setFilteredShippingData] = useState([]);
  const [clientShops, setClientShops] = useState([]);
  const [drivers, setDrivers] = useState([]);
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
    addr_longitude: '',
    addr_latitude: '',
    delivery_image_path: ''
  });
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [openMapDialog, setOpenMapDialog] = useState(false);
  const [mapDialogTitle, setMapDialogTitle] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState({
    status: '',
    driver: '',
    shop_name: '',
    search: '',
    date: ''
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getShippingData();
    getClientShops();
    getDrivers();
  }, []);

  // 当 DataGrid 筛选结果变化时更新 filteredShippingData
  useEffect(() => {
    setFilteredShippingData(shippingData);
  }, [shippingData]);

  const getShippingData = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setShippingData(data);
      setFilteredShippingData(data);
    } catch (error) {
      console.error('Error fetching shipping data:', error.message);
    }
  };

  const getClientShops = async () => {
    try {
      const { data, error } = await supabase
        .from('clientshop')
        .select('*')
        .order('shop_name');
      
      if (error) throw error;
      setClientShops(data);
    } catch (error) {
      console.error('Error fetching client shops:', error.message);
    }
  };

  const getDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('name');
      
      if (error) throw error;
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // 当选择商店名称时，自动填充经纬度
    if (name === 'shop_name') {
      const selectedShop = clientShops.find(shop => shop.shop_name === value);
      if (selectedShop) {
        setFormData(prev => ({
          ...prev,
          addr_longitude: selectedShop.longitude,
          addr_latitude: selectedShop.latitude
        }));
      }
    }
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
          maxSizeMB: 1, 
          maxWidthOrHeight: 1920,
          useWebWorker: true,
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

  // 处理 DataGrid 筛选变化
  const handleFilterModelChange = (model) => {
    // 这里简单实现，在实际应用中您可能需要更复杂的筛选逻辑
    if (model.items.length > 0) {
      // 有筛选条件
      const filtered = shippingData.filter(item => {
        for (const filter of model.items) {
          const field = filter.field;
          const value = filter.value;
          const operator = filter.operator;

          if (operator === 'contains') {
            if (!String(item[field]).toLowerCase().includes(String(value).toLowerCase())) {
              return false;
            }
          } else if (operator === 'equals') {
            if (String(item[field]) !== String(value)) {
              return false;
            }
          }
          // 可以根据需要添加更多操作符的处理
        }
        return true;
      });
      setFilteredShippingData(filtered);
    } else {
      // 没有筛选条件
      setFilteredShippingData(shippingData);
    }
  };

  // 处理手机端筛选
  const handleMobileFilterChange = (e) => {
    const { name, value } = e.target;
    setMobileFilters({
      ...mobileFilters,
      [name]: value
    });
  };

  const applyMobileFilters = () => {
    let filtered = [...shippingData];
    
    // 按状态筛选
    if (mobileFilters.status) {
      filtered = filtered.filter(item => item.status === mobileFilters.status);
    }
    
    // 按司机筛选
    if (mobileFilters.driver) {
      filtered = filtered.filter(item => item.driver === mobileFilters.driver);
    }
    
    // 按商店名称筛选
    if (mobileFilters.shop_name) {
      filtered = filtered.filter(item => item.shop_name === mobileFilters.shop_name);
    }
    
    // 按日期筛选
    if (mobileFilters.date) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === mobileFilters.date; // 比较日期
      });
    }
    
    // 全局搜索
    if (mobileFilters.search) {
      const searchTerm = mobileFilters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.shop_name && item.shop_name.toLowerCase().includes(searchTerm)) ||
        (item.invoice && item.invoice.toLowerCase().includes(searchTerm)) ||
        (item.driver && item.driver.toLowerCase().includes(searchTerm))
      );
    }
    
    setFilteredShippingData(filtered);
    setMobileFilterOpen(false);
  };

  const resetMobileFilters = () => {
    setMobileFilters({
      status: '',
      driver: '',
      shop_name: '',
      search: '',
      date: ''
    });
    setFilteredShippingData(shippingData);
    setMobileFilterOpen(false);
  };

  // 处理导出功能，包括照片URL
  const handleExportWithImages = async () => {
    try {
      setIsExporting(true);
      
      // 为所有有照片的记录获取照片的公共URL
      const dataWithImageUrls = await Promise.all(
        filteredShippingData.map(async (item) => {
          let imageUrl = '';
          if (item.delivery_image_path) {
            try {
              const { data, error } = await supabase.storage
                .from('delivery-images')
                .getPublicUrl(item.delivery_image_path);
              
              if (!error && data) {
                imageUrl = data.publicUrl;
              }
            } catch (e) {
              console.error('Error getting image URL:', e);
            }
          }
          
          return {
            ...item,
            image_url: imageUrl
          };
        })
      );
      
      // 生成CSV内容
      const headers = [
        'ID', 'Date', 'Driver', 'Invoice', 'Task', 
        'Shop Name', 'Status', 'Longitude', 'Latitude', 'Image URL'
      ];
      
      const csvContent = [
        headers.join(','),
        ...dataWithImageUrls.map(item => [
          item.id,
          item.date ? new Date(item.date).toISOString().split('T')[0] : '',
          item.driver || '',
          item.invoice || '',
          item.task || '',
          item.shop_name || '',
          item.status || '',
          item.addr_longitude || '',
          item.addr_latitude || '',
          item.image_url || ''
        ].join(','))
      ].join('\n');
      
      // 创建并下载CSV文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `shipping_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data with images');
    } finally {
      setIsExporting(false);
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
        {/* 添加移动端筛选UI */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" gap={1} mb={1}>
            <TextField
              fullWidth
              placeholder="Search..."
              size="small"
              name="search"
              value={mobileFilters.search}
              onChange={handleMobileFilterChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button 
              variant="contained"
              onClick={() => setMobileFilterOpen(true)}
              sx={{ 
                backgroundColor: colors.blueAccent[600],
                color: colors.grey[100],
              }}
            >
              <FilterListIcon />
            </Button>
          </Box>
          
          {/* 添加导出按钮 */}
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportWithImages}
              disabled={isExporting || filteredShippingData.length === 0}
              sx={{
                backgroundColor: colors.greenAccent[600],
                color: colors.grey[100],
                fontSize: "12px",
              }}
            >
              {isExporting ? 'Exporting...' : 'Export CSV with Images'}
            </Button>
          </Box>
          
          {(mobileFilters.status || mobileFilters.driver || mobileFilters.shop_name) && (
            <Box display="flex" gap={1} flexWrap="wrap">
              {mobileFilters.status && (
                <Typography variant="caption" sx={{ backgroundColor: colors.blueAccent[700], p: 0.5, borderRadius: 1 }}>
                  Status: {mobileFilters.status}
                </Typography>
              )}
              {mobileFilters.driver && (
                <Typography variant="caption" sx={{ backgroundColor: colors.blueAccent[700], p: 0.5, borderRadius: 1 }}>
                  Driver: {mobileFilters.driver}
                </Typography>
              )}
              {mobileFilters.shop_name && (
                <Typography variant="caption" sx={{ backgroundColor: colors.blueAccent[700], p: 0.5, borderRadius: 1 }}>
                  Shop: {mobileFilters.shop_name}
                </Typography>
              )}
              <Typography 
                variant="caption" 
                sx={{ backgroundColor: colors.redAccent[700], p: 0.5, borderRadius: 1, cursor: 'pointer' }}
                onClick={resetMobileFilters}
              >
                Clear All
              </Typography>
            </Box>
          )}
        </Box>
        
        {filteredShippingData.length === 0 ? (
          <Box p={2} textAlign="center">
            <Typography>No records found with current filters</Typography>
          </Box>
        ) : (
          filteredShippingData.map((shipping) => (
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
          ))
        )}
      </Box>
    );
  };

  const handleOpenMap = () => {
    setMapDialogTitle('View Selected Shipping Locations');
    setOpenMapDialog(true);
  };

  const calculateMapCenter = () => {
    const validShippings = filteredShippingData.filter(
      shipping => shipping.addr_latitude && shipping.addr_longitude && 
      !isNaN(shipping.addr_latitude) && !isNaN(shipping.addr_longitude)
    );

    if (validShippings.length === 0) {
      // 默认显示温哥华
      return [49.2827, -123.1207];
    }

    const latitudes = validShippings.map(s => parseFloat(s.addr_latitude));
    const longitudes = validShippings.map(s => parseFloat(s.addr_longitude));
    const avgLatitude = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
    const avgLongitude = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
    return [avgLatitude, avgLongitude];
  };

  // 自定义工具栏组件，添加导出带图片的CSV按钮
  const CustomToolbar = () => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <GridToolbar />
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleExportWithImages}
          disabled={isExporting}
          sx={{
            ml: 2,
            backgroundColor: colors.greenAccent[600],
            color: colors.grey[100],
            '&:hover': {
              backgroundColor: colors.greenAccent[700],
            },
          }}
        >
          {isExporting ? 'Exporting...' : 'Export CSV with Images'}
        </Button>
      </Box>
    );
  };

  return (
    <Box m="20px">
      <Header title="SHIPPING" subtitle="Manage Shipping Tasks" />
      
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
          View Selected Shipping
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
            components={{ Toolbar: CustomToolbar }}
            onFilterModelChange={handleFilterModelChange}
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
              '& .MuiFormControl-root': { m: 1, width: isMobile ? '100%' : '47%' },
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
            <FormControl fullWidth>
              <InputLabel>Driver</InputLabel>
              <Select
                name="driver"
                value={formData.driver}
                onChange={handleInputChange}
                required
              >
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.name}>
                    {driver.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="invoice"
              label="Invoice"
              value={formData.invoice}
              onChange={handleInputChange}
            />
            <FormControl>
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
            
            {/* Shop Name 从 clientshop 表中获取 */}
            <FormControl>
              <InputLabel>Shop Name</InputLabel>
              <Select
                name="shop_name"
                value={formData.shop_name}
                label="Shop Name"
                onChange={handleInputChange}
                required
              >
                {clientShops.map((shop) => (
                  <MenuItem key={shop.id} value={shop.shop_name}>
                    {shop.shop_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl>
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
            
            {/* 经纬度只读展示 */}
            <TextField
              name="addr_longitude"
              label="Longitude"
              type="number"
              value={formData.addr_longitude}
              onChange={handleInputChange}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              name="addr_latitude"
              label="Latitude"
              type="number"
              value={formData.addr_latitude}
              onChange={handleInputChange}
              InputProps={{
                readOnly: true,
              }}
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

      {/* 地图对话框 - 显示筛选后的 shipping 记录 */}
      <Dialog 
        open={openMapDialog} 
        onClose={() => setOpenMapDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          {mapDialogTitle}
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
              {filteredShippingData.filter(shipping => 
                shipping.addr_latitude && shipping.addr_longitude && 
                !isNaN(shipping.addr_latitude) && !isNaN(shipping.addr_longitude)
              ).map(shipping => (
                <Marker 
                  key={shipping.id} 
                  position={[parseFloat(shipping.addr_latitude), parseFloat(shipping.addr_longitude)]}
                >
                  <Popup>
                    <div>
                      <h3>{shipping.shop_name}</h3>
                      <p>Invoice: {shipping.invoice}</p>
                      <p>Task: {shipping.task}</p>
                      <p>Status: {shipping.status}</p>
                      <p>Driver: {shipping.driver}</p>
                      <p>Date: {new Date(shipping.date).toLocaleDateString()}</p>
                      <Button 
                        variant="contained" 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${shipping.addr_latitude},${shipping.addr_longitude}`, '_blank')}
                      >
                        Open in Google Map
                      </Button>
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

      {/* Mobile Filter Dialog */}
      <Dialog open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} fullWidth>
        <DialogTitle>Filter Records</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={mobileFilters.status}
                onChange={handleMobileFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Transit">In Transit</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Driver</InputLabel>
              <Select
                name="driver"
                value={mobileFilters.driver}
                onChange={handleMobileFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.name}>
                    {driver.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Shop</InputLabel>
              <Select
                name="shop_name"
                value={mobileFilters.shop_name}
                onChange={handleMobileFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                {clientShops.map((shop) => (
                  <MenuItem key={shop.id} value={shop.shop_name}>
                    {shop.shop_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <TextField
                name="date"
                label="Date"
                type="date"
                value={mobileFilters.date}
                onChange={handleMobileFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetMobileFilters}>Reset</Button>
          <Button onClick={applyMobileFilters} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shipping;
