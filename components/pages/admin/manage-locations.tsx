"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Upload, Search, Building, Users, MapPin, X, RefreshCw , Filter, Pencil } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useAuth } from '@/components/auth-provider';

interface Location {
  id: string;
  name: string;
  building: string;
  floor: string;
  wing?: string;
  room_number: string;
  location_type: string;
  images: string[];
  capacity: number;
  description?: string;
  is_available: boolean;
  created_date: string;
  bookings: any[];
}

interface LocationFormData {
  name: string;
  building: string;
  floor: string;
  wing: string;
  room_number: string;
  location_type: string;
  capacity: number;
  description: string;
  images: string[];
}

// Utility to get ordinal suffix for a number
function getOrdinal(n: string | number) {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return n;
  const s = ["th", "st", "nd", "rd"], v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]) + ' Floor';
}

// Utility to capitalize each word
function capitalizeWords(str: string) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

export function ManageLocations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  
  // Location type management state
  const [locationTypeOptions, setLocationTypeOptions] = useState<string[]>([]);
  const [newLocationType, setNewLocationType] = useState("");
  const [isSavingLocationType, setIsSavingLocationType] = useState(false);
  const [showAddLocationType, setShowAddLocationType] = useState(false);
  const [locationTypeToDelete, setLocationTypeToDelete] = useState<string | null>(null);
  const [isDeleteLocationTypeDialogOpen, setIsDeleteLocationTypeDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Refs for click-outside detection
  const locationTypeInputRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    building: '',
    floor: '',
    wing: '',
    room_number: '',
    location_type: '',
    capacity: 0,
    description: '',
    images: [],
  });

  useEffect(() => {
    fetchLocations();
    fetchLocationTypes();
  }, [currentPage, searchTerm, locationTypeFilter]);

  // Click-outside detection for location type input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAddLocationType &&
        locationTypeInputRef.current &&
        !locationTypeInputRef.current.contains(event.target as Node)
      ) {
        setShowAddLocationType(false)
        setNewLocationType("")
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showAddLocationType) {
        setShowAddLocationType(false)
        setNewLocationType("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscapeKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [showAddLocationType])

  const fetchLocations = async () => {
    try {
      setLoading(true);
      let url = `/api/locations?page=${currentPage}&limit=10`;
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (locationTypeFilter) {
        url += `&type=${locationTypeFilter}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      setLocations(data.locations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationTypes = async () => {
    try {
      const res = await fetch("/api/locations/types");
      if (res.ok) {
        const data = await res.json();
        setLocationTypeOptions(data.types || []);
      }
    } catch (e) {
      console.error("Error fetching location types:", e);
      // Set default location types as fallback
      setLocationTypeOptions(["LAB", "CLASSROOM", "OFFICE", "WAREHOUSE", "OTHER", "CABIN", "LECTURE_HALL", "AUDITORIUM", "SEMINAR_HALL"]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated. Please log in again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const url = editingLocation 
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations';
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingLocation ? 'Location updated successfully' : 'Location created successfully',
        });
        setIsDialogOpen(false);
        resetForm();
        fetchLocations();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save location',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: 'Failed to save location',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated. Please log in again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/locations/${locationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Location deleted successfully',
        });
        fetchLocations();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete location',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  const handleAddLocationType = async () => {
    if (!newLocationType.trim()) return
    setIsSavingLocationType(true)
    try {
      const res = await fetch("/api/locations/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newLocationType.trim() })
      })
      
      if (res.ok) {
        const data = await res.json()
        const formattedType = data.type
        setLocationTypeOptions((prev) => [...prev, formattedType])
        setFormData((prev) => ({ ...prev, location_type: formattedType }))
        setNewLocationType("")
        setShowAddLocationType(false)
        toast({ title: "Location type added!", description: "New location type added successfully." })
      } else {
        const error = await res.json()
        toast({ 
          title: "Error", 
          description: error.error || "Failed to add location type.", 
          variant: "destructive" 
        })
      }
    } catch (error) {
      console.error("Error adding location type:", error)
        toast({ 
          title: "Error", 
          description: "Failed to add location type.", 
          variant: "destructive" 
        })
    } finally {
      setIsSavingLocationType(false)
    }
  };

  const handleDeleteLocationType = async (type: string) => {
    try {
      const res = await fetch(`/api/locations/types?type=${encodeURIComponent(type)}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setLocationTypeOptions((prev) => prev.filter(t => t !== type))
        toast({ 
          title: "Location type removed!", 
          description: "Location type removed successfully." 
        })
      } else {
        const error = await res.json()
        if (error.componentsUsing) {
          toast({ 
            title: "Cannot delete location type", 
            description: `Location type is being used by ${error.count} location(s). Remove locations first.`, 
            variant: "destructive" 
          })
        } else {
          toast({ 
            title: "Error", 
            description: error.error || "Failed to delete location type.", 
            variant: "destructive" 
          })
        }
      }
    } catch (error) {
      console.error("Error deleting location type:", error)
      toast({ 
        title: "Error", 
        description: "Failed to delete location type.", 
        variant: "destructive" 
      })
    } finally {
      setIsDeleteLocationTypeDialogOpen(false)
      setLocationTypeToDelete(null)
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingImages(true);
      const formData = new FormData();
      
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch('/api/locations/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...data.images],
        }));
        toast({
          title: 'Success',
          description: 'Images uploaded successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to upload images',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      building: location.building,
      floor: location.floor,
      wing: location.wing || '',
      room_number: location.room_number,
      location_type: location.location_type,
      capacity: location.capacity,
      description: location.description || '',
      images: location.images,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      building: '',
      floor: '',
      wing: '',
      room_number: '',
      location_type: '',
      capacity: 0,
      description: '',
      images: [],
    });
    setNewLocationType("");
    setIsSavingLocationType(false);
    setShowAddLocationType(false);
    setLocationTypeToDelete(null);
    setIsDeleteLocationTypeDialogOpen(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const getLocationTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'LECTURE_HALL': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'LAB': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'AUDITORIUM': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'SEMINAR_HALL': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'CABIN': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100',
      'CLASSROOM': 'bg-indigo-100 text-indigo-800',
      'OFFICE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'WAREHOUSE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'OTHER': 'bg-slate-100 text-slate-800',
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="admin-page-title">Manage Room Bookings</h1>
        </div>
        <div className="flex gap-4">
          <button className="btn-edit" onClick={() => setEditMode(e => !e)}>
            {editMode ? 'Editing' : 'Edit Mode'}
          </button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-5 gap-6">
                  {/* Left Section - Basic Details (60%) */}
                  <div className="col-span-3 space-y-4">
                    {/* Row 1: Name + Building */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter location name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="building">Building *</Label>
                        <Input
                          id="building"
                          placeholder="Enter building name"
                          value={formData.building}
                          onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Room Number + Floor + Capacity */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="room_number">Room Number *</Label>
                        <Input
                          id="room_number"
                          placeholder="Enter room number"
                          value={formData.room_number}
                          onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="floor">Floor *</Label>
                        <Input
                          id="floor"
                          placeholder="Enter floor number"
                          value={formData.floor}
                          onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity *</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          placeholder="Enter capacity"
                          value={formData.capacity}
                          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    </div>

                    {/* Row 3: Wing + Location Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="wing">Wing (Optional)</Label>
                        <Input
                          id="wing"
                          placeholder="Enter wing name"
                          value={formData.wing}
                          onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="location_type">Location Type *</Label>
                          <div className="flex space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddLocationType(true)}
                              className="h-6 w-6 p-0"
                              title="Add location type"
                              aria-label="Add location type"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {formData.location_type && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLocationTypeToDelete(formData.location_type)
                                  setIsDeleteLocationTypeDialogOpen(true)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                title="Delete location type"
                                aria-label="Delete location type"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {showAddLocationType ? (
                          <div ref={locationTypeInputRef} className="flex gap-2 mt-1">
                            <Input
                              placeholder="Enter location type"
                              value={newLocationType}
                              onChange={(e) => setNewLocationType(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddLocationType}
                              disabled={!newLocationType.trim() || isSavingLocationType}
                            >
                              {isSavingLocationType ? "Adding..." : "Add"}
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={formData.location_type}
                            onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationTypeOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.replace(/_/g, ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Description (40%) */}
                  <div className="col-span-2">
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the location's purpose, features, and functionality"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={8}
                        className="h-full min-h-[200px]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Unified Bottom Section - Location Images */}
                <div className="space-y-4">
                  <Label>Location Images</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                        disabled={uploadingImages}
                      />
                      {uploadingImages && <span className="text-sm text-gray-500 dark:text-gray-400">Uploading...</span>}
                    </div>
                    {formData.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group cursor-pointer">
                            <img
                              src={image}
                              alt={`Location ${index + 1}`}
                              className="w-full h-40 object-cover rounded border"
                              onClick={() => setPreviewImage(image)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-6 w-6 p-0"
                              onClick={() => removeImage(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {previewImage && (
                      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-6">
                          <DialogHeader>
                            <DialogTitle>Image Preview</DialogTitle>
                          </DialogHeader>
                          <div className="flex items-center justify-center">
                            <img 
                              src={previewImage} 
                              alt="Location Preview" 
                              className="w-full h-96 object-contain rounded-lg bg-gray-50 dark:bg-slate-800 dark:bg-gray-800" 
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewImage(null)}
                              className="h-6 w-6 p-0"
                              title="Close preview"
                              aria-label="Close preview"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!formData.name || !formData.room_number || !formData.building || !formData.floor || !formData.location_type || formData.capacity <= 0}
                  >
                    {editingLocation ? 'Update Location' : 'Create Location'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Filter className="h-5 w-5 text-gray-400" />
        <Select value={locationTypeFilter} onValueChange={setLocationTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {locationTypeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No locations found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || locationTypeFilter !== '' 
                ? 'No locations match your search criteria. Try adjusting your filters.'
                : 'No locations have been created yet. Get started by adding your first location.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {locations.map((location) => (
            <Card key={location.id} className="flex flex-col h-full hover:shadow-md transition-shadow duration-200 group">
              <CardHeader className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{capitalizeWords(location.name)}</span>
                    </CardTitle>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{location.room_number} • {location.location_type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Badge className={getLocationTypeColor(location.location_type) + " text-xs px-1 py-0.5"}>
                      {location.is_available ? 'Available' : 'Booked'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col p-3 pt-0">
                <div className="space-y-3 flex-grow">
                  {/* Image Display */}
                  {location.images.length > 0 && (
                    <div className="relative w-full h-48">
                      <Carousel className="w-full h-full">
                        <CarouselContent>
                          {location.images.map((image, index) => (
                            <CarouselItem key={index} className="flex items-center justify-center h-48">
                              <img
                                src={image}
                                alt={`${location.name} ${index + 1}`}
                                className="w-full h-full object-contain rounded-md bg-gray-50 dark:bg-slate-800 dark:bg-gray-800"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {/* Navigation Buttons */}
                        {location.images.length > 1 && (
                          <div className="absolute inset-0 flex items-center justify-between px-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="pointer-events-auto bg-white dark:bg-slate-900/80 rounded-full">
                              <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 h-6 w-6" />
                            </div>
                            <div className="pointer-events-auto bg-white dark:bg-slate-900/80 rounded-full">
                              <CarouselNext className="right-2 top-1/2 -translate-y-1/2 h-6 w-6" />
                            </div>
                          </div>
                        )}
                        {/* Image Indicators */}
                        {location.images.length > 1 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-1 z-10">
                            {location.images.map((_, index) => (
                              <div 
                                key={index}
                                className="w-1 h-1 rounded-full bg-white dark:bg-slate-900/70"
                              />
                            ))}
                          </div>
                        )}
                      </Carousel>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between items-center mb-1">
                      <span><span className="font-medium">Capacity:</span> {location.capacity}</span>
                      <span><span className="font-medium">Floor:</span> {getOrdinal(location.floor)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span><span className="font-medium">Building:</span> {capitalizeWords(location.building)}</span>
                      <span className="text-gray-500 dark:text-gray-400"><span className="font-medium">Bookings:</span> {location.bookings?.length || 0}</span>
                    </div>
                    {location.wing && (
                      <div className="mt-1">
                        <span><span className="font-medium">Wing:</span> {location.wing}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  {editMode && (
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs text-red-600 hover:text-red-700"
                        onClick={() => { setLocationToDelete(location); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete <b>{locationToDelete ? capitalizeWords(locationToDelete.name) : ''}</b>? This action cannot be undone.</div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setLocationToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Location Type Confirmation Dialog */}
      <Dialog open={isDeleteLocationTypeDialogOpen} onOpenChange={setIsDeleteLocationTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Location Type
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this location type? This action cannot be undone if the location type is not being used by any locations.
            </DialogDescription>
          </DialogHeader>
          {locationTypeToDelete && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-800 dark:bg-gray-800 rounded-lg p-4">
                <p className="font-medium">Location Type: {locationTypeToDelete.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This will remove the location type from the available options. Locations currently using this type will not be affected.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteLocationTypeDialogOpen(false)
                    setLocationTypeToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => locationTypeToDelete && handleDeleteLocationType(locationTypeToDelete)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Location Type
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageLocations;