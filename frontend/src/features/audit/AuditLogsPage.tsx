'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Eye } from 'lucide-react';
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
} from './audit.utils';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

    // Fetch logs
    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            const data = await getAuditLogs();
            setLogs(data);
            setIsLoading(false);
        };

        fetchLogs();
    }, []);

    // Apply filters
    useEffect(() => {
        const filtered = filterLogs(logs, {
            search: searchQuery,
            module: selectedModule || undefined,
            action: selectedAction || undefined,
            dateRange: selectedDateRange,
        });
        setFilteredLogs(filtered);
    }, [logs, searchQuery, selectedModule, selectedAction, selectedDateRange]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedModule('');
        setSelectedAction('');
        setSelectedDateRange('7days');
    };

    const grouped = groupByDate(filteredLogs);
    const sortedDates = getSortedDateKeys(grouped);

    // Get unique modules and actions
    const modules = Array.from(new Set(logs.map(log => log.module))).sort();
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
                                    placeholder="Search by entity, description, or actor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Dropdowns */}
                        <div className="flex gap-2 flex-wrap">
                            <Select value={selectedModule} onValueChange={setSelectedModule}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All Modules" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Modules</SelectItem>
                                    {modules.map(module => (
                                        <SelectItem key={module} value={module}>
                                            {module}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedAction} onValueChange={setSelectedAction}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Actions</SelectItem>
                                    {actions.map(action => (
                                        <SelectItem key={action} value={action}>
                                            {action}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedDateRange} onValueChange={(v) => setSelectedDateRange(v as any)}>
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
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] text-center">
                            <div>
                                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-semibold text-lg mb-1">No audit logs found</h3>
                                <p className="text-sm text-muted-foreground">
                                    Try adjusting your filters
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
                                        {grouped[dateStr]?.map((log) => (
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
                                                            {/* Top Row: Action badge, Module pill, Time */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge
                                                                    className={`${getActionColor(log.action)} border`}
                                                                    variant="outline"
                                                                >
                                                                    {log.action}
                                                                </Badge>
                                                                <Badge variant="secondary">
                                                                    {log.module}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground ml-auto">
                                                                    {formatTime(log.timestamp)}
                                                                </span>
                                                            </div>

                                                            {/* Actor info and description */}
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium">
                                                                    {log.entityName}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {log.description}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                                                    <span className="font-medium text-foreground">
                                                                        {log.actorName}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {log.actorRole}
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
                                        ))}
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
                                            {selectedLog.action}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Module
                                        </p>
                                        <Badge variant="secondary" className="mt-1">
                                            {selectedLog.module}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Timestamp
                                        </p>
                                        <p className="text-sm mt-1">
                                            {format(new Date(selectedLog.timestamp), 'PPpp')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Severity
                                        </p>
                                        <Badge
                                            variant={
                                                selectedLog.severity === 'high'
                                                    ? 'destructive'
                                                    : selectedLog.severity === 'medium'
                                                      ? 'secondary'
                                                      : 'outline'
                                            }
                                            className="mt-1"
                                        >
                                            {selectedLog.severity}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Actor
                                        </p>
                                        <p className="text-sm mt-1">{selectedLog.actorName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Role
                                        </p>
                                        <p className="text-sm mt-1">{selectedLog.actorRole}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Entity Type
                                        </p>
                                        <p className="text-sm mt-1">{selectedLog.entityType}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                            Entity Name
                                        </p>
                                        <p className="text-sm mt-1">{selectedLog.entityName}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        Description
                                    </p>
                                    <p className="text-sm mt-1">{selectedLog.description}</p>
                                </div>
                            </div>

                            {/* Before/After JSON */}
                            {(selectedLog.before || selectedLog.after) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedLog.before && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                Before
                                            </p>
                                            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                                                {formatJSON(selectedLog.before)}
                                            </pre>
                                        </div>
                                    )}
                                    {selectedLog.after && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                After
                                            </p>
                                            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                                                {formatJSON(selectedLog.after)}
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
