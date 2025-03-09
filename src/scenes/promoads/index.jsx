import { Box, Button, Card, CardContent, CardMedia, CardActions, Typography, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, useMediaQuery, IconButton, Grid, CircularProgress } from "@mui/material";
import { tokens } from "../../theme";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImageIcon from '@mui/icons-material/Image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const PromoAds = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);
  
  const [ads, setAds] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedAd, setSelectedAd] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_path: '',
    link_url: '',
    active: true
  });
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  useEffect(() => {
    getAds();
  }, []);

  // 当 image_path 变化时，获取图片的公共 URL
  useEffect(() => {
    if (formData.image_path) {
      getImageUrl(formData.image_path);
    } else {
      setImagePreviewUrl('');
    }
  }, [formData.image_path]);

  const getAds = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 为每个广告获取图片 URL
      const adsWithImageUrls = await Promise.all(
        (data || []).map(async (ad) => {
          if (ad.image_path) {
            const { data: urlData } = await supabase
              .storage
              .from('promo-images')
              .getPublicUrl(ad.image_path);
            
            return {
              ...ad,
              image_url: urlData?.publicUrl || ''
            };
          }
          return {
            ...ad,
            image_url: ''
          };
        })
      );
      
      setAds(adsWithImageUrls);
    } catch (error) {
      console.error('Error fetching promotions:', error.message);
    }
  };

  const getImageUrl = async (path) => {
    if (!path) return;
    
    try {
      const { data } = await supabase
        .storage
        .from('promo-images')
        .getPublicUrl(path);
      
      setImagePreviewUrl(data?.publicUrl || '');
    } catch (error) {
      console.error('Error getting image URL:', error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      
      // 创建唯一的文件名
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `promo-images/${fileName}`; // 确保路径正确
      
      // 上传文件到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('promo-images') // 确保存储桶名称正确
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // 更新表单数据
      setFormData({
        ...formData,
        image_path: filePath // 确保这里是正确的字段
      });
      
    } catch (error) {
      console.error('Error uploading image:', error.message);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    setDialogMode('add');
    setFormData({
      title: '',
      description: '',
      image_path: '',
      link_url: '',
      active: true
    });
    setImagePreviewUrl('');
    setOpenDialog(true);
  };

  const handleEdit = (ad) => {
    setDialogMode('edit');
    setSelectedAd(ad);
    setFormData({
      title: ad.title || '',
      description: ad.description || '',
      image_path: ad.image_path || '',
      link_url: ad.link_url || '',
      active: ad.active !== undefined ? ad.active : true
    });
    setImagePreviewUrl(ad.image_url || '');
    setOpenDialog(true);
  };

  const handleDelete = async (id, imagePath) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      try {
        // 删除相关的图片（如果存在）
        if (imagePath) {
          const { error: deleteStorageError } = await supabase
            .storage
            .from('promo-images')
            .remove([imagePath]);
          
          if (deleteStorageError) console.error('Error deleting image:', deleteStorageError.message);
        }
        
        // 删除广告记录
        const { error } = await supabase
          .from('promotions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        await getAds();
      } catch (error) {
        console.error('Error deleting ad:', error.message);
        alert('Error deleting advertisement');
      }
    }
  };

  const handleSubmit = async () => {
    try {

      if (dialogMode === 'add') {
        const { error } = await supabase
          .from('promotions')
          .insert([{
            ...formData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotions')
          .update(formData)
          .eq('id', selectedAd.id);
        
        if (error) throw error;
      }
      
      setOpenDialog(false);
      await getAds();
    } catch (error) {
      console.error('Error saving ad:', error.message);
      alert('Error saving advertisement');
    }
  };

  const handlePreview = (ad) => {
    setPreviewAd(ad);
    setPreviewDialogOpen(true);
  };

  const handleAdClick = (ad) => {
    if (ad.link_url) {
      window.open(ad.link_url, '_blank');
    }
  };

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="PROMOTIONAL ADS" subtitle="Manage and View Featured Advertisements" />
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
          Add New Ad
        </Button>
      </Box>

      <Box mt={3}>
        <Grid container spacing={3}>
          {ads.map((ad) => (
            <Grid item xs={12} sm={6} md={4} key={ad.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  backgroundColor: colors.primary[400],
                  cursor: 'pointer',
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={ad.image_url || 'https://dummyimage.com/300x200/cccccc/ffffff&text=No+Image'}
                  alt={ad.title}
                  onClick={() => handleAdClick(ad)}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="div">
                    {ad.title}
                  </Typography>
                  <Typography variant="body2" color={colors.grey[300]}>
                    {ad.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton onClick={() => handleEdit(ad)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(ad.id, ad.image_path)}>
                    <DeleteIcon />
                  </IconButton>
                  <IconButton onClick={() => handlePreview(ad)}>
                    <VisibilityIcon />
                  </IconButton>
                  {ad.link_url && (
                    <IconButton onClick={() => window.open(ad.link_url, '_blank')}>
                      <LinkIcon />
                    </IconButton>
                  )}
                  {!ad.active && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        backgroundColor: colors.redAccent[700],
                        color: colors.grey[100],
                        padding: '3px 8px',
                        borderRadius: '4px',
                        marginLeft: 'auto' 
                      }}
                    >
                      Inactive
                    </Typography>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {ads.length === 0 && (
          <Box mt={5} textAlign="center">
            <Typography variant="h5">No advertisements found</Typography>
            <Typography variant="body1" mt={2}>
              Click the "Add New Ad" button to create your first advertisement
            </Typography>
          </Box>
        )}
      </Box>

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Advertisement' : 'Edit Advertisement'}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 2
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              name="title"
              label="Title"
              value={formData.title}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={4}
            />
            
            {/* 图片上传区域 */}
            <Box 
              sx={{ 
                border: `1px dashed ${colors.grey[500]}`,
                borderRadius: 1,
                p: 2,
                textAlign: 'center'
              }}
            >
              <Typography variant="subtitle1" mb={2}>Advertisement Image</Typography>
              
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                sx={{ mb: 2 }}
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              
              {formData.image_path && (
                <Typography variant="caption" display="block" mb={2}>
                  File: {formData.image_path}
                </Typography>
              )}
              
              {imagePreviewUrl && (
                <Box mt={2}>
                  <img 
                    src={imagePreviewUrl} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      objectFit: 'contain'
                    }} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://dummyimage.com/300x200/cccccc/ffffff&text=Error+Loading+Image';
                    }}
                  />
                </Box>
              )}
            </Box>
            
            <TextField
              name="link_url"
              label="Link URL"
              value={formData.link_url}
              onChange={handleInputChange}
              fullWidth
              helperText="Enter the URL where users will be redirected when clicking the ad"
            />
            
            <FormControl>
              <label>
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleCheckboxChange}
                />
                {' '}Active (Show this advertisement to users)
              </label>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={uploading}>
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Advertisement Preview</DialogTitle>
        <DialogContent>
          {previewAd && (
            <Box sx={{ textAlign: 'center' }}>
              <img 
                src={previewAd.image_url || 'https://dummyimage.com/600x400/cccccc/ffffff&text=No+Image'} 
                alt={previewAd.title}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  objectFit: 'contain' 
                }}
              />
              <Typography variant="h4" mt={2}>{previewAd.title}</Typography>
              <Typography variant="body1" mt={1} mb={2}>{previewAd.description}</Typography>
              
              {previewAd.link_url && (
                <Button 
                  variant="contained" 
                  startIcon={<LinkIcon />}
                  onClick={() => window.open(previewAd.link_url, '_blank')}
                  sx={{
                    backgroundColor: colors.greenAccent[600],
                    marginTop: 2
                  }}
                >
                  Visit Link
                </Button>
              )}
              
              {!previewAd.active && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    backgroundColor: colors.redAccent[700],
                    color: colors.grey[100],
                    padding: '8px',
                    borderRadius: '4px',
                    width: 'fit-content',
                    margin: '16px auto 0'
                  }}
                >
                  This advertisement is currently inactive and not visible to users
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromoAds;
