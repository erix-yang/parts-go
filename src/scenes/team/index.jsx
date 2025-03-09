import { Box, Typography, useTheme, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../components/Header";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const Team = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [teamData, setTeamData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('*');
      
      if (error) throw error;
      setTeamData(data);
    } catch (error) {
      console.error('Error fetching team data:', error.message);
    }
  };

  const handleEditClick = (record) => {
    setCurrentRecord(record);
    setOpenDialog(true);
  };

  const handleDeleteClick = async (id) => {
    const { error } = await supabase
      .from('team')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting record:', error.message);
    } else {
      fetchTeamData(); // Refresh data after deletion
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentRecord(null);
  };

  const handleSave = async () => {
    if (currentRecord.id) {
      // Update existing record
      const { error } = await supabase
        .from('team')
        .update(currentRecord)
        .eq('id', currentRecord.id);
      
      if (error) {
        console.error('Error updating record:', error.message);
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('team')
        .insert([currentRecord]);
      
      if (error) {
        console.error('Error adding record:', error.message);
      }
    }
    fetchTeamData(); // Refresh data after save
    handleDialogClose();
  };

  const handleAddClick = () => {
    setCurrentRecord({}); // Reset currentRecord for new entry
    setOpenDialog(true); // Open dialog for adding new record
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 100,
      cellClassName: "name-column--cell",
    },
    // {
    //   field: "age",
    //   headerName: "Age",
    //   flex: 1,
    //   minWidth: 100,
    //   headerAlign: 'left',
    //   align: 'left',
    // },
    // {
    //   field: "phone",
    //   headerName: "Phone Number",
    //   flex: 1,
    //   minWidth: 120,
    //   headerAlign: 'left',
    //   align: 'left',
    // },
    // {
    //   field: "email",
    //   headerName: "Email",
    //   flex: 1,
    //   minWidth: 200,
    //   headerAlign: 'left',
    //   align: 'left',
    // },
    {
      field: "accessLevel",
      headerName: "Access Level",
      flex: 1,
      minWidth: 100,
      headerAlign: 'left',
      align: 'left',
      renderCell: ({ row: { access } }) => {
        return (
          <Box
            width="60%"
            m="0 auto"
            p="5px"
            display="flex"
            justifyContent="center"
            backgroundColor={
              access === "admin"
                ? colors.greenAccent[600]
                : access === "manager"
                ? colors.greenAccent[700]
                : colors.greenAccent[700]
            }
            borderRadius="4px"
          >
            {access === "admin" && <AdminPanelSettingsOutlinedIcon />}
            {access === "manager" && <SecurityOutlinedIcon />}
            {access === "user" && <LockOpenOutlinedIcon />}
            <Typography color={colors.grey[100]} sx={{ ml: "5px" }}>
              {access}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => (
        <Box>
          <Button onClick={() => handleEditClick(params.row)}>Edit</Button>
          <Button onClick={() => handleDeleteClick(params.row.id)}>Delete</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="TEAM" subtitle="Managing the Team Members" />
      <Button variant="contained" color="primary" onClick={handleAddClick} sx={{ mb: 2 }}>
        Add New Member
      </Button>
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
            fontSize: '16px',
            textAlign: 'left',
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
            fontSize: '16px',
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
          '@media (max-width: 600px)': {
            height: '50vh',
            '& .MuiDataGrid-columnHeaders': {
              fontSize: '14px',
            },
            '& .MuiDataGrid-cell': {
              fontSize: '14px',
            },
          },
        }}
      >
        <DataGrid checkboxSelection rows={teamData} columns={columns} />
      </Box>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>{currentRecord?.id ? "Edit Record" : "Add Record"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentRecord?.name || ""}
            onChange={(e) => setCurrentRecord({ ...currentRecord, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Age"
            type="number"
            fullWidth
            variant="outlined"
            value={currentRecord?.age || ""}
            onChange={(e) => setCurrentRecord({ ...currentRecord, age: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            type="text"
            fullWidth
            variant="outlined"
            value={currentRecord?.phone || ""}
            onChange={(e) => setCurrentRecord({ ...currentRecord, phone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentRecord?.email || ""}
            onChange={(e) => setCurrentRecord({ ...currentRecord, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Access Level"
            type="text"
            fullWidth
            variant="outlined"
            value={currentRecord?.access || ""}
            onChange={(e) => setCurrentRecord({ ...currentRecord, access: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Team;
