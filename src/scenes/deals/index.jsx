import { 
  Box, Button, Card, CardContent, Typography, useTheme, useMediaQuery, 
  Tabs, Tab, Chip, IconButton, Paper, Divider, Container,
  Slide, MobileStepper, Fade
} from "@mui/material";
import { tokens } from "../../theme";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header";
import LinkIcon from '@mui/icons-material/Link';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Link } from "react-router-dom";

const Deals = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [deals, setDeals] = useState([]);
  const [featuredDeals, setFeaturedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    getActiveDeals();
  }, []);

  const getActiveDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 为每个广告获取图片 URL（虽然我们不会在卡片中展示）
      const dealsWithImageUrls = await Promise.all(
        (data || []).map(async (deal) => {
          if (deal.image_path) {
            const { data: urlData } = await supabase
              .storage
              .from('promo-images')
              .getPublicUrl(deal.image_path);
            
            return {
              ...deal,
              image_url: urlData?.publicUrl || '',
              category: deal.category || 'Other' // 确保每个交易都有分类
            };
          }
          return {
            ...deal,
            image_url: '',
            category: deal.category || 'Other'
          };
        })
      );
      
      // 提取所有唯一的分类
      const uniqueCategories = ['All'];
      dealsWithImageUrls.forEach(deal => {
        if (deal.category && !uniqueCategories.includes(deal.category)) {
          uniqueCategories.push(deal.category);
        }
      });
      
      // 设置特色交易（前3个）用于轮播图
      setFeaturedDeals(dealsWithImageUrls.slice(0, 3));
      setDeals(dealsWithImageUrls);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching deals:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (deal) => {
    if (deal.link_url) {
      window.open(deal.link_url, '_blank');
    }
  };

  const handleCategoryChange = (event, newValue) => {
    setSelectedCategory(newValue);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => 
      prevActiveStep === featuredDeals.length - 1 ? 0 : prevActiveStep + 1
    );
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => 
      prevActiveStep === 0 ? featuredDeals.length - 1 : prevActiveStep - 1
    );
  };

  // 根据选定的分类筛选交易
  const filteredDeals = selectedCategory === 'All' 
    ? deals 
    : deals.filter(deal => deal.category === selectedCategory);

  return (
    <Box>
      {/* 轮播图部分 - 使用简单的轮播替代 SwipeableViews */}
      {featuredDeals.length > 0 && (
        <Box 
          sx={{ 
            bgcolor: colors.primary[500],
            pt: 2,
            pb: 4
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h3" align="center" mb={3} sx={{ fontWeight: 'bold' }}>
              Featured Promotions
            </Typography>
            
            <Box sx={{ position: 'relative', width: '100%', height: 300 }}>
              {/* 使用 Fade 替代 SwipeableViews */}
              {featuredDeals.map((deal, index) => (
                <Fade 
                  key={deal.id}
                  in={index === activeStep} 
                  timeout={500}
                  style={{ 
                    display: index === activeStep ? 'block' : 'none',
                    width: '100%'
                  }}
                >
                  <Box
                    sx={{
                      height: 280,
                      p: 3,
                      mx: 1,
                      borderRadius: 2,
                      bgcolor: colors.primary[400],
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        bgcolor: colors.primary[600],
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                      }
                    }}
                    onClick={() => handleDealClick(deal)}
                  >
                    <Box position="absolute" top={10} right={10}>
                      <Chip 
                        icon={<LocalOfferIcon />} 
                        label={deal.category || 'Featured'}
                        sx={{ 
                          bgcolor: colors.greenAccent[600], 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 2, color: colors.grey[100] }}>
                        {deal.title}
                      </Typography>
                      <Typography variant="h5" sx={{ mb: 3, maxWidth: '80%', color: colors.grey[200] }}>
                        {deal.description}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<LinkIcon />}
                        sx={{
                          mt: 2,
                          bgcolor: colors.blueAccent[500],
                          color: colors.grey[100],
                          borderRadius: 0.5,
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: colors.blueAccent[400],
                            color: colors.grey[100],
                          }
                        }}
                      >
                        View This Offer
                      </Button>
                    </Box>
                    
                    <Box 
                      position="absolute" 
                      bottom={0} 
                      right={0} 
                      sx={{ 
                        opacity: 0.2,
                        transform: 'rotate(-10deg) translateY(20px)',
                        transformOrigin: 'bottom right'
                      }}
                    >
                      <AutoFixHighIcon sx={{ fontSize: 200, color: colors.grey[100] }} />
                    </Box>
                  </Box>
                </Fade>
              ))}
              
              <MobileStepper
                steps={featuredDeals.length}
                position="static"
                activeStep={activeStep}
                sx={{ 
                  bgcolor: 'transparent',
                  mt: 2,
                  '& .MuiMobileStepper-dot': {
                    bgcolor: colors.grey[500]
                  },
                  '& .MuiMobileStepper-dotActive': {
                    bgcolor: colors.greenAccent[500]
                  }
                }}
                nextButton={
                  <IconButton size="small" onClick={handleNext} disabled={featuredDeals.length <= 1}>
                    <KeyboardArrowRight fontSize="large" sx={{ color: colors.grey[100] }} />
                  </IconButton>
                }
                backButton={
                  <IconButton size="small" onClick={handleBack} disabled={featuredDeals.length <= 1}>
                    <KeyboardArrowLeft fontSize="large" sx={{ color: colors.grey[100] }} />
                  </IconButton>
                }
              />
            </Box>
          </Container>
        </Box>
      )}
      
      {/* 主要内容部分 */}
      <Container maxWidth="lg">
        <Box m="20px">
          <Header title="ALL PROMOTIONS" subtitle="Browse all available offers and deals" />
          
          {/* 分类选项卡 */}
          <Paper 
            elevation={3} 
            sx={{ 
              mt: 3, 
              mb: 4, 
              p: 2, 
              bgcolor: colors.primary[400],
              borderRadius: 2
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <FilterListIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Filter By Category</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Tabs
              value={selectedCategory}
              onChange={handleCategoryChange}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: colors.greenAccent[500],
                },
                '& .MuiTab-root': {
                  color: colors.grey[300],
                  '&.Mui-selected': {
                    color: colors.greenAccent[400],
                    fontWeight: 'bold',
                  },
                },
              }}
            >
              {categories.map((category) => (
                <Tab key={category} label={category} value={category} />
              ))}
            </Tabs>
          </Paper>
          
          {loading ? (
            <Box display="flex" justifyContent="center" mt={5}>
              <Typography variant="h5">Loading deals...</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 3 }}>
              {filteredDeals.map((deal) => (
                <Card 
                  key={deal.id}
                  sx={{ 
                    bgcolor: colors.primary[400],
                    borderLeft: `6px solid ${colors.greenAccent[500]}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: `0 8px 16px rgba(0,0,0,0.2)`,
                    }
                  }}
                  onClick={() => handleDealClick(deal)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {deal.title}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={deal.category || 'Offer'} 
                        sx={{ 
                          bgcolor: colors.blueAccent[700],
                          color: colors.grey[100]
                        }} 
                      />
                    </Box>
                    
                    <Typography variant="body1" color={colors.grey[200]} sx={{ mb: 3 }}>
                      {deal.description}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Button 
                        variant="outlined" 
                        startIcon={<LinkIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDealClick(deal);
                        }}
                        sx={{
                          borderColor: colors.blueAccent[500],
                          color: colors.blueAccent[500],
                          textTransform: 'none',
                          borderRadius: 0.5,
                          '&:hover': {
                            borderColor: colors.blueAccent[400],
                            backgroundColor: 'rgba(64, 113, 205, 0.08)',
                            color: colors.blueAccent[600],
                          }
                        }}
                      >
                        View Offer
                      </Button>
                      
                      <Typography variant="caption" color={colors.grey[400]}>
                        Added: {new Date(deal.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {!loading && filteredDeals.length === 0 && (
            <Box mt={5} textAlign="center" p={5} sx={{ backgroundColor: colors.primary[400], borderRadius: 2 }}>
              <Typography variant="h5">No promotions found in this category</Typography>
              <Typography variant="body1" mt={2}>
                Please try another category or check back later for new offers!
              </Typography>
            </Box>
          )}
        </Box>
      </Container>

      <Box display="flex" justifyContent="flex-end" mt={2} sx={{ justifyContent: 'center' }}>
        <Button
          component={Link}
          to="/login"
          variant="outlined"
          sx={{
            color: colors.blueAccent[600],
            borderColor: colors.blueAccent[600],
            '&:hover': {
              backgroundColor: colors.blueAccent[600],
              color: colors.grey[100],
            },
            marginRight: 2,
          }}
        >
          Log In
        </Button>
        <Button
          component={Link}
          to="/register"
          variant="outlined"
          sx={{
            color: colors.blueAccent[600],
            borderColor: colors.blueAccent[600],
            '&:hover': {
              backgroundColor: colors.blueAccent[600],
              color: colors.grey[100],
            },
          }}
        >
          Sign Up
        </Button>
      </Box>
    </Box>
  );
};

export default Deals;