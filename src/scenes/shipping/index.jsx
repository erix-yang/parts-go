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

// Custom marker icons for different statuses
const createStatusIcon = (status) => {
  let iconUrl;
  
  switch (status) {
    case 'Delivered':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
      break;
    case 'In Transit':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      break;
    default: // Pending
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';
      break;
  }
  
  return L.icon({
    iconUrl: iconUrl,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const Shipping = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  // Helper functions for handling Pacific Time
  const formatDateString = (dateString) => {
    if (!dateString) return '';
    // Simply return the date portion if it's an ISO string, or the string as is
    return dateString.split('T')[0];
  };

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

  // Add this new state for desktop filters
  const [desktopFilters, setDesktopFilters] = useState({
    status: '',
    driver: '',
    date: ''
  });

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
      
      // Save the current filters before updating data
      const hasDesktopFilters = desktopFilters.status || desktopFilters.driver || desktopFilters.date;
      const hasMobileFilters = mobileFilters.status || mobileFilters.driver || 
                               mobileFilters.shop_name || mobileFilters.date || mobileFilters.search;
      
      // Update the data
      setShippingData(data);
      
      // Don't reset filtered data yet if we have active filters
      if (!hasDesktopFilters && !hasMobileFilters) {
        setFilteredShippingData(data);
      }
      
      // Re-apply filters if needed
      if (isMobile && hasMobileFilters) {
        setTimeout(applyMobileFilters, 0);
      } else if (!isMobile && hasDesktopFilters) {
        setTimeout(applyDesktopFilters, 0);
      }
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
        
        // Reapply filters after data refresh
        if (isMobile) {
          if (mobileFilters.status || mobileFilters.driver || mobileFilters.shop_name || 
              mobileFilters.date || mobileFilters.search) {
            applyMobileFilters();
          }
        } else {
          if (desktopFilters.status || desktopFilters.driver || desktopFilters.date) {
            applyDesktopFilters();
          }
        }
      } catch (error) {
        console.error('Error deleting shipping:', error.message);
        alert('Error deleting shipping entry');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // Use the date string directly without timezone conversion
      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('shipping')
          .insert([{ ...formData }]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shipping')
          .update({ ...formData })
          .eq('id', selectedShipping.id);
        
        if (error) throw error;
      }
      
      setOpenDialog(false);
      await getShippingData();
      
      // Reapply filters after data refresh
      if (isMobile) {
        // Reapply mobile filters if any exist
        if (mobileFilters.status || mobileFilters.driver || mobileFilters.shop_name || 
            mobileFilters.date || mobileFilters.search) {
          applyMobileFilters();
        }
      } else {
        // Reapply desktop filters if any exist
        if (desktopFilters.status || desktopFilters.driver || desktopFilters.date) {
          applyDesktopFilters();
        }
      }
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
          
          // Reapply filters after data refresh
          if (isMobile) {
            if (mobileFilters.status || mobileFilters.driver || mobileFilters.shop_name || 
                mobileFilters.date || mobileFilters.search) {
              applyMobileFilters();
            }
          } else {
            if (desktopFilters.status || desktopFilters.driver || desktopFilters.date) {
              applyDesktopFilters();
            }
          }
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
    if (model.items.length > 0) {
      // 有筛选条件
      const filtered = shippingData.filter(item => {
        // 循环所有筛选条件，当前逻辑是所有条件都必须满足（AND 逻辑）
        return model.items.every(filter => {
          const field = filter.field;
          const value = filter.value;
          const operator = filter.operator;

          // 空值检查
          if (value === undefined || value === null || value === '') return true;

          // 确保字段值存在
          const itemValue = item[field];
          if (itemValue === undefined || itemValue === null) return false;
          
          // 日期字段需要特殊处理
          if (field === 'date') {
            const itemDate = new Date(itemValue).setHours(0, 0, 0, 0);
            const filterDate = new Date(value).setHours(0, 0, 0, 0);
            
            switch (operator) {
              case 'equals':
              case 'is':
              case '=':
                return itemDate === filterDate;
              case '>':
                return itemDate > filterDate;
              case '>=':
                return itemDate >= filterDate;
              case '<':
                return itemDate < filterDate;
              case '<=':
                return itemDate <= filterDate;
              case '!=':
              case 'not':
                return itemDate !== filterDate;
              default:
                return true;
            }
          }
          
          // 字符串比较（大多数字段）
          const itemValueStr = String(itemValue).toLowerCase();
          const filterValueStr = String(value).toLowerCase();

          // 根据不同操作符处理
          switch (operator) {
            case 'contains':
              return itemValueStr.includes(filterValueStr);
            case 'equals':
            case 'is':
            case '=':
              return itemValueStr === filterValueStr;
            case 'startsWith':
              return itemValueStr.startsWith(filterValueStr);
            case 'endsWith':
              return itemValueStr.endsWith(filterValueStr);
            case 'isEmpty':
              return itemValueStr === '';
            case 'isNotEmpty':
              return itemValueStr !== '';
            case '!=':
            case 'not':
              return itemValueStr !== filterValueStr;
            // 数值比较
            case '>':
              return parseFloat(itemValue) > parseFloat(value);
            case '>=':
              return parseFloat(itemValue) >= parseFloat(value);
            case '<':
              return parseFloat(itemValue) < parseFloat(value);
            case '<=':
              return parseFloat(itemValue) <= parseFloat(value);
            default:
              // 关键修复：未知操作符应该返回 true 而不是 false
              // 这样不会干扰其他有效的过滤条件
              return true;
          }
        });
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
        const itemDate = formatDateString(item.date);
        return itemDate === mobileFilters.date;
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
      // Use the simple string format directly
      valueFormatter: (params) => formatDateString(params.value),
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
          
          {/* 添加导出按钮和应用过滤器按钮 */}
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportWithImages}
              disabled={isExporting || filteredShippingData.length === 0}
              sx={{
                backgroundColor: colors.greenAccent[600],
                color: colors.grey[100],
                '&:hover': {
                  backgroundColor: colors.greenAccent[500],
                  color: colors.grey[100],
                },
                fontSize: "12px",
                mr: 1, // Add margin to separate buttons
              }}
            >
              {isExporting ? 'Exporting...' : 'Export CSV with Images'}
            </Button>
            {/* Add Apply Filter button */}
            <Button 
              variant="contained"
              onClick={applyFilters}
              sx={{ 
                backgroundColor: colors.blueAccent[600],
                color: colors.grey[100],
                '&:hover': {
                  backgroundColor: colors.blueAccent[500],
                }
              }}
            >
              Apply Filters
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
                  Date: {formatDateString(shipping.date)}
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
        
        {/* Map Display for Filtered Shipping Data */}
        <Box sx={{ height: '70vh', width: '100%', mt: 2 }}>
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
            ).map(shipping => {
              // Find the corresponding client shop for the shipping record
              const clientShop = clientShops.find(shop => shop.shop_name === shipping.shop_name);

              return (
                <Marker 
                  key={shipping.id} 
                  position={[parseFloat(shipping.addr_latitude), parseFloat(shipping.addr_longitude)]}
                  icon={createStatusIcon(shipping.status)}
                >
                  <Popup>
                    <div>
                      <h3>{shipping.shop_name}</h3>
                      <p>Invoice: {shipping.invoice}</p>
                      <p>Task: {shipping.task}</p>
                      <p>Status: {shipping.status}</p>
                      <p>Driver: {shipping.driver}</p>
                      <p>Date: {formatDateString(shipping.date)}</p>

                      <Button 
                        variant="contained" 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${shipping.addr_latitude},${shipping.addr_longitude}`, '_blank')}
                        startIcon={<LocationOnIcon />}
                        sx={{ mt: 1 }}
                        color="primary"
                        fullWidth
                      >
                        Open in Google Map
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Box>
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

  // Add this new handler for desktop filter changes
  const handleDesktopFilterChange = (e) => {
    const { name, value } = e.target;
    setDesktopFilters({
      ...desktopFilters,
      [name]: value
    });
  };

  // Add this function to apply desktop filters
  const applyDesktopFilters = () => {
    let filtered = [...shippingData];
    
    // Filter by status
    if (desktopFilters.status) {
      filtered = filtered.filter(item => item.status === desktopFilters.status);
    }
    
    // Filter by driver
    if (desktopFilters.driver) {
      filtered = filtered.filter(item => item.driver === desktopFilters.driver);
    }
    
    // Filter by date
    if (desktopFilters.date) {
      filtered = filtered.filter(item => {
        const itemDate = formatDateString(item.date);
        return itemDate === desktopFilters.date;
      });
    }
    
    setFilteredShippingData(filtered);
  };

  // Add this function to reset desktop filters
  const resetDesktopFilters = () => {
    setDesktopFilters({
      status: '',
      driver: '',
      date: ''
    });
    setFilteredShippingData(shippingData);
  };

  // Apply filters whenever they change
  useEffect(() => {
    applyDesktopFilters();
  }, [desktopFilters]); // This will apply filters when any filter value changes

  // Add this function to apply filters
  const applyFilters = () => {
    if (isMobile) {
      applyMobileFilters();
    } else {
      applyDesktopFilters();
    }
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
            '&:hover': {
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[100],
            },
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
            '&:hover': {
              backgroundColor: colors.blueAccent[500],
              color: colors.grey[100],
            },
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
          }}
        >
          Add New Shipping
        </Button>
      </Box>

      {/* Add desktop filter panel - only show on desktop */}
      {!isMobile && (
        <Box 
          display="flex" 
          flexDirection="column"
          gap={2} 
          p={3} 
          mb={3} 
          bgcolor={colors.primary[400]}
          borderRadius="8px"
          boxShadow={`0px 4px 10px rgba(0, 0, 0, 0.1)`}
        >
          <Typography variant="h6" fontWeight="600" mb={1}>
            Filter Shipping Records
          </Typography>
          
          <Box 
            display="flex" 
            flexWrap="wrap" 
            gap={2} 
            alignItems="flex-start"
          >
            <FormControl 
              sx={{ 
                minWidth: 180,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: colors.primary[500],
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: colors.primary[450],
                  }
                }
              }}
            >
              <InputLabel>Status</InputLabel>
              <Select
                size="small"
                name="status"
                value={desktopFilters.status}
                onChange={handleDesktopFilterChange}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Transit">In Transit</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl 
              sx={{ 
                minWidth: 220,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: colors.primary[500],
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: colors.primary[450],
                  }
                }
              }}
            >
              <InputLabel>Driver</InputLabel>
              <Select
                size="small"
                name="driver"
                value={desktopFilters.driver}
                onChange={handleDesktopFilterChange}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">All Drivers</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.name}>
                    {driver.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              name="date"
              label="Date"
              type="date"
              size="small"
              value={desktopFilters.date}
              onChange={handleDesktopFilterChange}
              InputLabelProps={{ shrink: true }}
              sx={{ 
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: colors.primary[500],
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: colors.primary[450],
                  }
                }
              }}
            />
            
            <Button 
              variant="outlined"
              onClick={resetDesktopFilters}
              startIcon={<FilterListIcon />}
              sx={{ 
                height: 40, 
                borderRadius: '8px',
                borderColor: colors.grey[400],
                color: colors.grey[100],
                '&:hover': {
                  borderColor: colors.grey[300],
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                }
              }}
            >
              Clear Filters
            </Button>

            {/* Add Apply Filter button */}
            <Button 
              variant="contained"
              onClick={applyFilters}
              sx={{ 
                height: 40, 
                borderRadius: '8px',
                backgroundColor: colors.blueAccent[600],
                color: colors.grey[100],
                '&:hover': {
                  backgroundColor: colors.blueAccent[500],
                }
              }}
            >
              Apply Filters
            </Button>
          </Box>
          
          {/* Show active filters */}
          {(desktopFilters.status || desktopFilters.driver || desktopFilters.date) && (
            <Box 
              display="flex" 
              flexWrap="wrap" 
              gap={1} 
              alignItems="center" 
              mt={1}
              p={1.5}
              borderRadius="6px"
              bgcolor={colors.primary[500]}
            >
              <Typography variant="body2" fontWeight="600" mr={1}>
                Active filters:
              </Typography>
              {desktopFilters.status && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: colors.blueAccent[600],
                    padding: '4px 10px',
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: colors.blueAccent[500],
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Status: {desktopFilters.status}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setDesktopFilters({...desktopFilters, status: ''})}
                    sx={{ 
                      p: 0.2, 
                      color: colors.grey[100],
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {desktopFilters.driver && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: colors.greenAccent[600],
                    padding: '4px 10px',
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: colors.greenAccent[500],
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Driver: {desktopFilters.driver}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setDesktopFilters({...desktopFilters, driver: ''})}
                    sx={{ 
                      p: 0.2, 
                      color: colors.grey[100],
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {desktopFilters.date && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: colors.redAccent[600],
                    padding: '4px 10px',
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: colors.redAccent[500],
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Date: {desktopFilters.date}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setDesktopFilters({...desktopFilters, date: ''})}
                    sx={{ 
                      p: 0.2, 
                      color: colors.grey[100],
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

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
            rows={filteredShippingData}
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
              
              {/* Add map legend */}
              <div style={{ 
                position: 'absolute', 
                bottom: '30px', 
                right: '20px', 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                padding: '12px 15px', 
                borderRadius: '10px',
                zIndex: 1000,
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.1)',
                maxWidth: '200px',
                backdropFilter: 'blur(5px)'
              }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 0.5 }}>
                  Status Legend
                </Typography>
                <Box display="flex" alignItems="center" mt={1.5}>
                  <div style={{ 
                    height: '20px', 
                    width: '20px', 
                    backgroundColor: '#FFA500', 
                    borderRadius: '50%', 
                    marginRight: '10px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="body2">Pending</Typography>
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  <div style={{ 
                    height: '20px', 
                    width: '20px', 
                    backgroundColor: '#2196F3', 
                    borderRadius: '50%', 
                    marginRight: '10px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="body2">In Transit</Typography>
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  <div style={{ 
                    height: '20px', 
                    width: '20px', 
                    backgroundColor: '#4CAF50', 
                    borderRadius: '50%', 
                    marginRight: '10px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="body2">Delivered</Typography>
                </Box>
              </div>
              
              {filteredShippingData.filter(shipping => 
                shipping.addr_latitude && shipping.addr_longitude && 
                !isNaN(shipping.addr_latitude) && !isNaN(shipping.addr_longitude)
              ).map(shipping => {
                // Find the corresponding client shop for the shipping record
                const clientShop = clientShops.find(shop => shop.shop_name === shipping.shop_name);

                return (
                  <Marker 
                    key={shipping.id} 
                    position={[parseFloat(shipping.addr_latitude), parseFloat(shipping.addr_longitude)]}
                    icon={createStatusIcon(shipping.status)}
                  >
                    <Popup>
                      <div>
                        <h3>{shipping.shop_name}</h3>
                        <p>Invoice: {shipping.invoice}</p>
                        <p>Task: {shipping.task}</p>
                        <p>Status: {shipping.status}</p>
                        <p>Driver: {shipping.driver}</p>
                        <p>Date: {formatDateString(shipping.date)}</p>

                        <Button 
                          variant="contained" 
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${shipping.addr_latitude},${shipping.addr_longitude}`, '_blank')}
                          startIcon={<LocationOnIcon />}
                          sx={{ mt: 1 }}
                          color="primary"
                          fullWidth
                        >
                          Open in Google Map
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
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
          {/* Add Apply Filter button */}
          <Button onClick={applyFilters} variant="contained">Apply Filters</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shipping;
