import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './EventsList.css';
import { fetchWithAuth } from '../utils/api';
import RegistrationModal from '../components/RegistrationModal';
import defaultEventImage from '../assets/default-event.jpg';

const EventsList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({
        department: '',
        category: '',
        ageGroup: '',
        date: ''
    });
    const [userFavorites, setUserFavorites] = useState(new Set());
    const [userRegistrations, setUserRegistrations] = useState(new Set());
    const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        const loadUserData = async () => {
            if (!user) return;

            try {
                const [savedResponse, registeredResponse] = await Promise.all([
                    fetchWithAuth('/users/saved-events'),
                    fetchWithAuth('/users/registered-events')
                ]);

                setUserFavorites(new Set(savedResponse.map(event => event._id)));
                setUserRegistrations(new Set(registeredResponse.map(event => event._id)));
            } catch (err) {
                console.error('Error loading user data:', err);
                setActionFeedback({
                    message: 'Failed to load user data',
                    type: 'error'
                });
            }
        };

        loadUserData();
    }, [user]);

    const fetchEvents = async () => {
        try {
            const data = await fetchWithAuth('/events');
            setEvents(data);
        } catch (err) {
            setError('Failed to load events');
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        
        try {
            const response = await fetch(`http://localhost:3002/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete event');
            
            // Remove event from state
            setEvents(events.filter(event => event._id !== eventId));
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Failed to delete event');
        }
    };

    const handleFavorite = async (eventId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetchWithAuth(`/events/${eventId}/favorite`, {
                method: 'POST'
            });

            if (response.isFavorited) {
                setUserFavorites(prev => new Set([...prev, eventId]));
                setActionFeedback({ 
                    message: 'Event added to favorites!', 
                    type: 'success' 
                });
            } else {
                setUserFavorites(prev => {
                    const newFavorites = new Set(prev);
                    newFavorites.delete(eventId);
                    return newFavorites;
                });
                setActionFeedback({ 
                    message: 'Event removed from favorites', 
                    type: 'info' 
                });
            }

            setTimeout(() => setActionFeedback({ message: '', type: '' }), 3000);
        } catch (err) {
            console.error('Error favoriting event:', err);
            setActionFeedback({ 
                message: err.message || 'Failed to update favorites', 
                type: 'error' 
            });
        }
    };

    const handleRegister = async (eventId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        const event = events.find(e => (e.id || e._id) === eventId);
        if (!event) {
            setActionFeedback({
                message: 'Event not found',
                type: 'error'
            });
            return;
        }

        setSelectedEvent(event);
    };

    const handleRegistrationSubmit = async (formData) => {
        try {
            setIsRegistering(true);
            const response = await fetchWithAuth(`/events/${selectedEvent.id || selectedEvent._id}/register`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.isRegistered) {
                setUserRegistrations(prev => new Set([...prev, selectedEvent.id || selectedEvent._id]));
                setActionFeedback({
                    message: 'Successfully registered for event!',
                    type: 'success'
                });
                setSelectedEvent(null);
            }
        } catch (err) {
            setActionFeedback({
                message: err.message || 'Failed to register for event',
                type: 'error'
            });
        } finally {
            setIsRegistering(false);
        }
    };

    const formatDate = (date, time) => {
        try {
            // Handle different date formats
            let dateString = date;
            if (typeof date === 'string') {
                // If date includes time information, extract just the date part
                if (date.includes('T')) {
                    dateString = date.split('T')[0];
                }
            }

            // Combine date and time
            const dateTimeString = `${dateString}T${time}`;
            
            // Parse the ISO string
            const dateObj = parseISO(dateTimeString);
            
            // Check if date is valid
            if (isNaN(dateObj.getTime())) {
                return 'Invalid date';
            }

            return format(dateObj, 'EEEE, MMMM d, yyyy h:mm a');
        } catch (err) {
            console.error('Error formatting date:', err, { date, time });
            return 'Invalid date';
        }
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = !filter.department || event.department === filter.department;
        const matchesCategory = !filter.category || event.category === filter.category;
        const matchesAgeGroup = !filter.ageGroup || event.ageGroup === filter.ageGroup;

        return matchesSearch && matchesDepartment && matchesCategory && matchesAgeGroup;
    });

    if (loading) return <div className="events-loading">Loading events...</div>;
    if (error) return <div className="events-error">{error}</div>;

    return (
        <div className="events-page">
            {actionFeedback.message && (
                <div className={`action-feedback ${actionFeedback.type}`}>
                    {actionFeedback.message}
                </div>
            )}
            <div className="events-header">
                <h1>
                    Community Events
                    {user?.isAdmin && (
                        <Link to="/events/create" className="create-event-button">
                            Create New Event
                        </Link>
                    )}
                </h1>
                
                <div className="search-filter-section">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search events by title, description, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filters">
                        <div className="filter-group">
                            <label className="filter-label">Department</label>
                            <select 
                                value={filter.department} 
                                onChange={(e) => setFilter({...filter, department: e.target.value})}
                            >
                                <option value="">All Departments</option>
                                <option value="Parks and Recreation">Parks and Recreation</option>
                                <option value="Police Department">Police Department</option>
                                <option value="Fire Department">Fire Department</option>
                                <option value="Community Services">Community Services</option>
                                <option value="Development Services">Development Services</option>
                                <option value="Public Works">Public Works</option>
                                <option value="Water Department">Water Department</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Category</label>
                            <select 
                                value={filter.category} 
                                onChange={(e) => setFilter({...filter, category: e.target.value})}
                            >
                                <option value="">All Categories</option>
                                <option value="Arts & Culture">Arts & Culture</option>
                                <option value="Classes & Programs">Classes & Programs</option>
                                <option value="Community">Community</option>
                                <option value="Council & Boards">Council & Boards</option>
                                <option value="Parks & Recreation">Parks & Recreation</option>
                                <option value="Public Safety">Public Safety</option>
                                <option value="Senior Activities">Senior Activities</option>
                                <option value="Special Events">Special Events</option>
                                <option value="Youth Programs">Youth Programs</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Age Group</label>
                            <select 
                                value={filter.ageGroup} 
                                onChange={(e) => setFilter({...filter, ageGroup: e.target.value})}
                            >
                                <option value="">All Age Groups</option>
                                <option value="All Ages">All Ages</option>
                                <option value="Youth (0-12)">Youth (0-12)</option>
                                <option value="Teens (13-17)">Teens (13-17)</option>
                                <option value="Adults (18+)">Adults (18+)</option>
                                <option value="Seniors (55+)">Seniors (55+)</option>
                                <option value="Family">Family</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="events-grid">
                {filteredEvents.map(event => (
                    <div key={event._id} className="event-card">
                        <img 
                            src={event.imageUrl || defaultEventImage} 
                            alt={event.title}
                            className="event-image"
                            onError={(e) => {
                                e.target.src = defaultEventImage;
                                e.target.onerror = null; // Prevent infinite loop
                            }}
                        />
                        {user && !user.isAdmin && (
                            <button 
                                className={`favorite-button ${userFavorites.has(event._id) ? 'favorited' : ''}`}
                                onClick={() => handleFavorite(event._id)}
                            >
                                {userFavorites.has(event._id) ? '❤️' : '🤍'}
                            </button>
                        )}
                        <div className="event-content">
                            <div>
                                <div className="event-date">
                                    {formatDate(event.startDate, event.startTime)}
                                </div>
                                <h3 className="event-title">{event.title}</h3>
                                <div className="event-location">
                                    📍 {event.location}
                                </div>
                                <div className="event-price">
                                    {event.cost || 'Free'}
                                </div>
                            </div>
                            <div className="event-actions">
                                <button className="view-details-button">Details</button>
                                <button className="buy-tickets-button">
                                    {event.registrationRequired ? 'Register' : 'Join'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedEvent && (
                <RegistrationModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onSubmit={handleRegistrationSubmit}
                    isLoading={isRegistering}
                />
            )}
        </div>
    );
};

export default EventsList;