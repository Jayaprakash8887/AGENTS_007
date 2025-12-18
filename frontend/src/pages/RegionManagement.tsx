
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    useRegions,
    useCreateRegion,
    useUpdateRegion,
    useDeleteRegion
} from '@/hooks/useRegions';
import { Region } from '@/types';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/ui/loading-skeleton';

export default function RegionManagement() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRegion, setEditingRegion] = useState<Region | null>(null);

    const { data: regions, isLoading } = useRegions();
    const createRegion = useCreateRegion();
    const updateRegion = useUpdateRegion();
    const deleteRegion = useDeleteRegion();

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Region>>();

    const filteredRegions = regions?.filter(region =>
        region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        region.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenDialog = (region?: Region) => {
        if (region) {
            setEditingRegion(region);
            setValue('name', region.name);
            setValue('code', region.code);
            setValue('currency', region.currency);
            setValue('description', region.description);
            setValue('isActive', region.isActive);
        } else {
            setEditingRegion(null);
            reset({ isActive: true });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: Partial<Region>) => {
        try {
            if (editingRegion) {
                await updateRegion.mutateAsync({
                    id: editingRegion.id,
                    data: { ...data }
                });
                toast.success('Region updated successfully');
            } else {
                await createRegion.mutateAsync(data);
                toast.success('Region created successfully');
            }
            setIsDialogOpen(false);
            reset();
        } catch (error) {
            toast.error(editingRegion ? 'Failed to update region' : 'Failed to create region');
            console.error(error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete region "${name}"?`)) {
            try {
                await deleteRegion.mutateAsync(id);
                toast.success('Region deleted successfully');
            } catch (error) {
                toast.error('Failed to delete region');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Region Management</h1>
                    <p className="text-muted-foreground">
                        Manage regions and locations for policies and employees
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Region
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Regions</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search regions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <TableSkeleton rows={5} columns={5} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Region Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegions?.map((region) => (
                                    <TableRow key={region.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                {region.name}
                                            </div>
                                            {region.description && (
                                                <p className="text-xs text-muted-foreground ml-6 truncate max-w-[200px]">
                                                    {region.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {region.code ? <Badge variant="outline">{region.code}</Badge> : '-'}
                                        </TableCell>
                                        <TableCell>{region.currency || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={region.isActive ? "default" : "secondary"}>
                                                {region.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog(region)}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(region.id, region.name)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredRegions?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No regions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRegion ? 'Edit Region' : 'Add New Region'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Region Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. India, USA"
                                {...register('name', { required: true })}
                            />
                            {errors.name && <span className="text-xs text-destructive">Required</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="code">Region Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. IND"
                                    {...register('code')}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input
                                    id="currency"
                                    placeholder="e.g. INR"
                                    {...register('currency')}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Optional description"
                                {...register('description')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="isActive">Active Status</Label>
                            <Switch
                                id="isActive"
                                defaultChecked={editingRegion ? editingRegion.isActive : true}
                                onCheckedChange={(checked) => setValue('isActive', checked)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createRegion.isPending || updateRegion.isPending}>
                                {editingRegion ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
