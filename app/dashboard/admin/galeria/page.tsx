'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Upload, X, ArrowLeft, Image as ImageIcon, Tag } from 'lucide-react'

interface Barber {
  id: string
  user?: {
    name: string | null
  }
}

interface GalleryImage {
  id: string
  cloud_storage_path: string
  imageUrl: string
  title: string
  description: string | null
  tags: string[]
  gender: string | null
  barberId: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function GestionGaleriaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [genderFilter, setGenderFilter] = useState<string>('ALL')

  // Estados para nuevo registro
  const [newImage, setNewImage] = useState({
    title: '',
    description: '',
    tags: '',
    gender: 'UNISEX',
    barberId: '',
    order: 0,
    cloud_storage_path: ''
  })

  // Estados para subida de imagen
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para imágenes de género
  const [uploadingGenderImage, setUploadingGenderImage] = useState<'male' | 'female' | null>(null)
  const [showGenderImagesDialog, setShowGenderImagesDialog] = useState(false)

  // Cargar imágenes y barberos
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    if (status === 'authenticated') {
      fetchImages()
      fetchBarbers()
    }
  }, [status, session, router])

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/gallery?includeInactive=true')
      if (response.ok) {
        const data = await response.json()
        setImages(data)
      }
    } catch (error) {
      console.error('Error fetching images:', error)
      toast.error('Error loading images')
    } finally {
      setLoading(false)
    }
  }

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/barbers')
      if (response.ok) {
        const data = await response.json()
        setBarbers(data.barbers || [])
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    }
  }

  // Manejo de subida de archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image')
        return
      }
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      toast.error('Please drag a valid image')
    }
  }

  const handleImageUpload = async (): Promise<string | null> => {
    if (!uploadedFile) {
      toast.error('Please select an image')
      return null
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/gallery/upload-image', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setNewImage(prev => ({ ...prev, cloud_storage_path: data.cloud_storage_path }))
        toast.success('Image uploaded successfully')
        return data.cloud_storage_path
      } else {
        toast.error('Error uploading image')
        return null
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const removeUploadedImage = () => {
    setUploadedFile(null)
    setUploadPreview('')
    setNewImage(prev => ({ ...prev, cloud_storage_path: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Crear imagen
  const handleAddImage = async () => {
    if (!newImage.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!newImage.cloud_storage_path && !uploadedFile) {
      toast.error('Debes subir una imagen')
      return
    }

    try {
      let cloudStoragePath = newImage.cloud_storage_path

      // Si hay un archivo sin subir, subirlo primero
      if (uploadedFile && !newImage.cloud_storage_path) {
        const uploadedPath = await handleImageUpload()
        if (!uploadedPath) {
          toast.error('Error al subir la imagen')
          return
        }
        cloudStoragePath = uploadedPath
      }

      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newImage,
          cloud_storage_path: cloudStoragePath,
          tags: newImage.tags ? newImage.tags.split(',').map(t => t.trim()).filter(t => t) : [],
          barberId: newImage.barberId || null
        })
      })

      if (response.ok) {
        toast.success('Image added successfully')
        setIsAddDialogOpen(false)
        setNewImage({ title: '', description: '', tags: '', gender: 'UNISEX', barberId: '', order: 0, cloud_storage_path: '' })
        removeUploadedImage()
        fetchImages()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error adding image')
      }
    } catch (error) {
      console.error('Error adding image:', error)
      toast.error('Error adding image')
    }
  }

  // Actualizar imagen
  const handleUpdateImage = async () => {
    if (!selectedImage) return

    try {
      const response = await fetch(`/api/gallery/${selectedImage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedImage.title,
          description: selectedImage.description,
          order: selectedImage.order,
          isActive: selectedImage.isActive
        })
      })

      if (response.ok) {
        toast.success('Image updated successfully')
        setIsEditDialogOpen(false)
        setSelectedImage(null)
        fetchImages()
      } else {
        toast.error('Error updating image')
      }
    } catch (error) {
      console.error('Error updating image:', error)
      toast.error('Error updating image')
    }
  }

  // Eliminar imagen
  const handleDeleteImage = async (id: string) => {
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Image deleted successfully')
        fetchImages()
      } else {
        toast.error('Error deleting image')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      toast.error('Error deleting image')
    }
  }

  // Subir imagen de género
  const handleUploadGenderImage = async (gender: 'male' | 'female', file: File) => {
    setUploadingGenderImage(gender)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('gender', gender)

      const response = await fetch('/api/gallery/gender-images', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Image updated successfully')
        // Forzar recarga de la imagen
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error uploading image')
      }
    } catch (error) {
      console.error('Error uploading gender image:', error)
      toast.error('Error uploading image')
    } finally {
      setUploadingGenderImage(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-black p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/admin')}
              className="text-gray-400 hover:text-cyan-400 hover:bg-transparent shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-1 truncate">
                <span className="bg-gradient-to-r from-[#00f0ff] to-purple-500 bg-clip-text text-transparent">
                  Gallery Management
                </span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Manage public gallery images</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={showGenderImagesDialog} onOpenChange={setShowGenderImagesDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2.5">
                  <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="sm:inline">Gender Images</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Gender Selection Images</DialogTitle>
                </DialogHeader>
                <p className="text-gray-400 text-sm mb-4">
                  These images are shown on the &quot;Get Inspired&quot; selection screen
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Men */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Men</h3>
                      <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden relative">
                        <Image
                          src="/uploads/gender-images/male.jpg"
                          alt="Men"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadGenderImage('male', file)
                        }}
                        disabled={uploadingGenderImage === 'male'}
                        className="bg-gray-700 border-gray-600 text-white text-sm"
                      />
                      {uploadingGenderImage === 'male' && (
                        <p className="text-cyan-400 text-sm mt-2">Uploading...</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Women */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-pink-400 mb-3">Women</h3>
                      <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden relative">
                        <Image
                          src="/uploads/gender-images/female.jpg"
                          alt="Women"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadGenderImage('female', file)
                        }}
                        disabled={uploadingGenderImage === 'female'}
                        className="bg-gray-700 border-gray-600 text-white text-sm"
                      />
                      {uploadingGenderImage === 'female' && (
                        <p className="text-pink-400 text-sm mt-2">Uploading...</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2.5">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="sm:inline">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* Subida de imagen */}
                <div className="space-y-2">
                  <Label className="text-white">Image *</Label>
                  {!uploadPreview ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-2">Drag an image or click to select</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
                        <Image
                          src={uploadPreview}
                          alt="Preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeUploadedImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {!newImage.cloud_storage_path && (
                        <Button
                          onClick={handleImageUpload}
                          disabled={isUploading}
                          className="w-full mt-2"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Title *</Label>
                  <Input
                    id="title"
                    value={newImage.title}
                    onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="E.g.: Modern Interior"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={newImage.description}
                    onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Image description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-white flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    value={newImage.tags}
                    onChange={(e) => setNewImage({ ...newImage, tags: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="E.g: haircut, fade, design (comma separated)"
                  />
                  <p className="text-xs text-gray-400">Separate multiple tags with commas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-white">Category</Label>
                  <select
                    id="gender"
                    value={newImage.gender}
                    onChange={(e) => setNewImage({ ...newImage, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="MALE">Men</option>
                    <option value="FEMALE">Women</option>
                    <option value="UNISEX">Unisex (Both)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barberId" className="text-white">Barber (Optional)</Label>
                  <select
                    id="barberId"
                    value={newImage.barberId}
                    onChange={(e) => setNewImage({ ...newImage, barberId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.user?.name || 'Barber'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order" className="text-white">Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={newImage.order}
                    onChange={(e) => setNewImage({ ...newImage, order: parseInt(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => {
                  setIsAddDialogOpen(false)
                  setNewImage({ title: '', description: '', tags: '', gender: 'UNISEX', barberId: '', order: 0, cloud_storage_path: '' })
                  removeUploadedImage()
                }}>Cancel</Button>
                <Button onClick={handleAddImage}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Label className="text-white font-semibold text-sm sm:text-base shrink-0">Filter:</Label>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-auto"
          >
            <option value="ALL">All</option>
            <option value="MALE">Men</option>
            <option value="FEMALE">Women</option>
            <option value="UNISEX">Unisex</option>
          </select>
          <span className="text-gray-400 text-xs sm:text-sm">
            ({Array.isArray(images) ? images.filter(img => genderFilter === 'ALL' || img.gender === genderFilter).length : 0} photos)
          </span>
        </div>

        {/* Grid de imágenes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {Array.isArray(images) && images.filter(img => genderFilter === 'ALL' || img.gender === genderFilter).map((image) => (
            <Card key={image.id} className="bg-gray-900 border-gray-800 overflow-hidden">
              <div className="relative aspect-video bg-gray-800">
                <Image
                  src={image.imageUrl}
                  alt={image.title}
                  fill
                  className="object-cover"
                />
                {!image.isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-red-400 font-semibold">Inactiva</span>
                  </div>
                )}
              </div>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="text-white text-sm sm:text-base lg:text-lg flex-1 truncate">{image.title}</CardTitle>
                  <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs rounded-full shrink-0 ${
                    image.gender === 'MALE' ? 'bg-cyan-500/20 text-cyan-400' :
                    image.gender === 'FEMALE' ? 'bg-pink-500/20 text-pink-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {image.gender === 'MALE' ? '♂' : image.gender === 'FEMALE' ? '♀' : '⚥'}
                  </span>
                </div>
                {image.description && (
                  <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">{image.description}</p>
                )}
                {image.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {image.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] sm:text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                    {image.tags.length > 3 && (
                      <span className="text-[10px] sm:text-xs text-gray-500">+{image.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2">Orden: {image.order}</p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="flex gap-1.5 sm:gap-2">
                  <Dialog open={isEditDialogOpen && selectedImage?.id === image.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open)
                    if (!open) setSelectedImage(null)
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedImage(image)}
                        className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs sm:text-sm py-1.5 sm:py-2 h-8 sm:h-9"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline ml-1">Edit</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-800 max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Edit Image</DialogTitle>
                      </DialogHeader>
                      {selectedImage && (
                        <div className="space-y-3">
                          <div className="relative w-full h-48 bg-gray-800 rounded-lg overflow-hidden">
                            <Image
                              src={selectedImage.imageUrl}
                              alt={selectedImage.title}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-title" className="text-white">Title</Label>
                            <Input
                              id="edit-title"
                              value={selectedImage.title}
                              onChange={(e) => setSelectedImage({ ...selectedImage, title: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description" className="text-white">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={selectedImage.description || ''}
                              onChange={(e) => setSelectedImage({ ...selectedImage, description: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-white"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-order" className="text-white">Order</Label>
                            <Input
                              id="edit-order"
                              type="number"
                              value={selectedImage.order}
                              onChange={(e) => setSelectedImage({ ...selectedImage, order: parseInt(e.target.value) || 0 })}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="edit-isActive"
                              checked={selectedImage.isActive}
                              onChange={(e) => setSelectedImage({ ...selectedImage, isActive: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="edit-isActive" className="text-white">Active image</Label>
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => {
                          setIsEditDialogOpen(false)
                          setSelectedImage(null)
                        }}>Cancel</Button>
                        <Button onClick={handleUpdateImage}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10 text-xs sm:text-sm py-1.5 sm:py-2 h-8 sm:h-9"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline ml-1">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This action cannot be undone. The image will be permanently removed from the gallery.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 text-white border-gray-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteImage(image.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {images.length === 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">No images in the gallery</p>
              <p className="text-sm text-gray-500 text-center mt-2">
                Add images so customers can see your work
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
