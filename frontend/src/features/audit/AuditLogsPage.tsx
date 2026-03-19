'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Eye, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type AuditLog } from './audit.types';
import { getAuditLogs } from './audit.api';
import {
    groupByDate,
    getDateLabel,
    getSortedDateKeys,
    formatTime,
    getActionColor,
    formatJSON,
    filterLogs,
    getUserName,
    getUserRole,
    getEntityName,
    capitalizeWords,
} from './audit.utils';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [selectedDateRange, setSelectedDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

    // Fetch logs
    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getAuditLogs({ limit: 100 });
                setLogs(response.items);
            } catch (err) {
                console.error('Failed to fetch audit logs:', err);
                setError(err instanceof Error ? err.message : 'Failed to load audit logs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, []);

    // Apply filters
    useEffect(() => {
        const filtered = filterLogs(logs, {
            search: searchQuery,
            resource_type: selectedResourceType === 'all' ? undefined : selectedResourceType,
            action: selectedAction === 'all' ? undefined : selectedAction,
            dateRange: selectedDateRange,
        });
        setFilteredLogs(filtered);
    }, [logs, searchQuery, selectedResourceType, selectedAction, selectedDateRange]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedResourceType('all');
        setSelectedAction('all');
        setSelectedDateRange('7days');
    };

    const grouped = groupByDate(filteredLogs);
    const sortedDates = getSortedDateKeys(grouped);

    // Get unique resource types and actions
    const resourceTypes = Array.from(new Set(logs.map(log => log.resource_type))).sort();
    const actions = Array.from(new Set(logs.map(log => log.action))).sort();

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <PageHeader
                title="Audit Logs"
                description="Monitor all system activities and changes"
            />

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Filters */}
                <Card className="m-6 mb-4 p-4">
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by entity, description, or user..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Dropdowns */}
                        <div className="flex gap-2 flex-wrap">
                            <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All Resource Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Resource Types</SelectItem>
                                    {resourceTypes.map(type => (
                                        <SelectItem key={type} value={type}>
                                            {capitalizeWords(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedAction} onValueChange={setSelectedAction}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {actions.map(action => (
                                        <SelectItem key={action} value={action}>
                                            {capitalizeWords(action)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedDateRange}
                                onValueChange={(v) =>
                                    setSelectedDateRange(
                                        v as 'today' | '7days' | '30days' | 'all'
                                    )
                                }
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Date Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7days">Last 7 Days</SelectItem>
                                    <SelectItem value="30days">Last 30 Days</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                                className="ml-auto"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {isLoading ? (
                        <div className="space-y-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-5 w-32" />
                                    <div className="space-y-3 ml-6">
                                        {[1, 2, 3].map(j => (
                                            <Skeleton key={j} className="h-16 w-full" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-[400px] text-center">
                            <div>
                                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                                <h3 className="font-semibold text-lg mb-1">Failed to load audit logs</h3>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] text-center">
                            <div>
                                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-semibold text-lg mb-1">No audit logs found</h3>
                                <p className="text-sm text-muted-foreground">
                                    {logs.length === 0 
                                        ? 'No audit logs have been recorded yet'
                                        : 'Try adjusting your filters'
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {sortedDates.map(dateStr => (
                                <div key={dateStr}>
                                    {/* Date Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="text-sm font-semibold text-muted-foreground flex-shrink-0">
                                            {getDateLabel(dateStr)}
                                        </span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    {/* Logs */}
                                    <div className="space-y-3 ml-6 relative before:absolute before:left-[-24px] before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
                                        {grouped[dateStr]?.map((log) => {
                                            const userName = getUserName(log);
                                            const userRole = getUserRole(log);
                                            const entityName = getEntityName(log);

                                            return (
                                                <div
                                                    key={log.id}
                                                    className="relative group"
                                                >
                                                    {/* Timeline dot */}
                                                    <div className="absolute -left-[34px] top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                                                    {/* Log entry card */}
                                                    <Card className="p-4 hover:shadow-md transition-shadow">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 space-y-2">
                                                                {/* Top Row: Action badge, Resource Type pill, Time */}
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Badge
                                                                        className={`${getActionColor(log.action)} border`}
                                                                        variant="outline"
                                                                    >
                                                                        {capitalizeWords(log.action)}
                                                                    </Badge>
                                                                    <Badge variant="secondary">
                                                                        {capitalizeWords(log.resource_type)}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                                        {formatTime(log.created_at)}
                                                                    </span>
                                                                </div>

                                                                {/* Entity info and description */}
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-medium">
                                                                        {entityName}
                                                                    </p>
                                                                    {log.resource_id && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            ID: {log.resource_id}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                                                        <span className="font-medium text-foreground">
                                                                            {userName}
                                                                        </span>
                                                                        <span>•</span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {userRole}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* View Details Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedLog(log);
                                                                    setIsDetailsOpen(true);
                                                                }}
                                                                className="flex-shrink-0"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Details Dialog */}
            {selectedLog && (
                <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Audit Log Details</DialogTitle>
                            <DialogDescription>
                                Log ID: {selectedLog.id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Summary Section */}
                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Action
                                        </p>
                                        <Badge className={`${getActionColor(selectedLog.action)} border mt-1`}>
                                            {capitalizeWords(selectedLog.action)}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Resource Type
                                        </p>
                                        <Badge variant="secondary" className="mt-1">
                                            {capitalizeWords(selectedLog.resource_type)}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Timestamp
                                        </p>
                                        <p className="text-sm mt-1">
                                            {format(new Date(selectedLog.created_at), 'PPpp')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Resource ID
                                        </p>
                                        <p className="text-sm mt-1">
                                            {selectedLog.resource_id || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            User
                                        </p>
                                        <p className="text-sm mt-1">{getUserName(selectedLog)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Role
                                        </p>
                                        <p className="text-sm mt-1">{getUserRole(selectedLog)}</p>
                                    </div>
                                </div>

                                {selectedLog.user && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                Username
                                            </p>
                                            <p className="text-sm mt-1">{selectedLog.user.username}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                Email
                                            </p>
                                            <p className="text-sm mt-1">{selectedLog.user.email}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedLog.description && (
                                    <div className="pt-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Description
                                        </p>
                                        <p className="text-sm mt-1">{selectedLog.description}</p>
                                    </div>
                                )}

                                {(selectedLog.ip_address || selectedLog.user_agent) && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        {selectedLog.ip_address && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                    IP Address
                                                </p>
                                                <p className="text-sm mt-1">{selectedLog.ip_address}</p>
                                            </div>
                                        )}
                                        {selectedLog.user_agent && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                    User Agent
                                                </p>
                                                <p className="text-sm mt-1 truncate" title={selectedLog.user_agent}>
                                                    {selectedLog.user_agent}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Before/After JSON */}
                            {(selectedLog.old_values || selectedLog.new_values) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedLog.old_values && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                Old Values
                                            </p>
                                            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                                                {formatJSON(selectedLog.old_values)}
                                            </pre>
                                        </div>
                                    )}
                                    {selectedLog.new_values && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                New Values
                                            </p>
                                            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                                                {formatJSON(selectedLog.new_values)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
