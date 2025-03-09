import { useState, useEffect, useRef } from "react";
import FullCalendar, { formatDate } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useMediaQuery,
} from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { formatDate as coreFormatDate } from '@fullcalendar/core';
import { supabase } from "../../supabaseClient";

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [currentEvents, setCurrentEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calendarRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      console.log("Fetching events from database");
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        console.log("Fetched events:", data);
        setCurrentEvents(data || []);
      }
    };

    fetchEvents();
  }, []);

  const handleDateClick = (selected) => {
    setSelectedDate(selected.dateStr);
    setOpenDialog(true);
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      alert("Please enter an event title");
      return;
    }

    // Create the event object
    const newEvent = {
      id: `${selectedDate}-${Date.now()}`, // Ensure unique ID
      title: eventTitle,
      date: selectedDate, // Use just the date from the click
    };

    try {
      console.log("Saving event to database:", newEvent);
      
      // Add to database
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([newEvent]);

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Event saved successfully:", data);

      // Then update state
      setCurrentEvents(prev => [...prev, newEvent]);
      
      // Reset form
      setOpenDialog(false);
      setEventTitle('');
      
      // Force refresh calendar if needed
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.refetchEvents();
        calendarApi.render(); // Ensure the calendar rerenders
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert(`Error adding event: ${error.message}`);
    }
  };

  const handleEventClick = async (selected) => {
    if (
      window.confirm(
        `Are you sure you want to delete the event '${selected.event.title}'`
      )
    ) {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', selected.event.id);

        if (error) throw error;
        
        selected.event.remove();
        setCurrentEvents((prev) => prev.filter(event => event.id !== selected.event.id));
      } catch (error) {
        console.error('Error deleting event:', error);
        alert(`Error deleting event: ${error.message}`);
      }
    }
  };

  return (
    <Box m="20px">
      <Header title="Calendar" subtitle="Schedule and Manage Events" />

      <Box 
        display="flex" 
        flexDirection={isMobile ? "column" : "row"}
        justifyContent="space-between"
      >
        {/* CALENDAR SIDEBAR */}
        <Box
          flex={isMobile ? "1 1 100%" : "1 1 20%"}
          backgroundColor={colors.primary[400]}
          p="15px"
          borderRadius="4px"
          mb={isMobile ? 2 : 0}
        >
          <Typography variant="h5">Events</Typography>
          <List sx={{ maxHeight: isMobile ? "200px" : "75vh", overflow: "auto" }}>
            {currentEvents.map((event) => (
              <ListItem
                key={event.id}
                sx={{
                  backgroundColor: colors.greenAccent[500],
                  margin: "10px 0",
                  borderRadius: "2px",
                }}
              >
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Typography>
                      {event.date ? new Date(event.date).toLocaleDateString() : ""}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* CALENDAR */}
        <Box flex={isMobile ? "1 1 100%" : "1 1 100%"} ml={isMobile ? 0 : "15px"}>
          <FullCalendar
            ref={calendarRef}
            height={isMobile ? "500px" : "75vh"}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: isMobile ? "dayGridMonth,listMonth" : "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView={isMobile ? "listMonth" : "dayGridMonth"}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            events={currentEvents.map(event => ({
              id: event.id,
              title: event.title,
              date: event.date, // FullCalendar can handle this format
              allDay: true
            }))}
          />
        </Box>
      </Box>

      {/* 添加事件对话框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Event for {selectedDate ? new Date(selectedDate).toLocaleDateString() : ""}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Title"
            type="text"
            fullWidth
            variant="outlined"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddEvent} variant="contained">Add Event</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
