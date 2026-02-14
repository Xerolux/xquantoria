import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Tab,
  Tabs,
} from '@mui/material';
import {
  SearchOutlined,
  VisibilityOutlined,
  RefreshOutlined,
  CreditCardOutlined,
  PaymentOutlined,
  TrendingUpOutlined,
  MoneyOffOutlined,
  FilterListOutlined,
} from '@mui/icons-material';
import { paymentService } from '../services/api';

interface Transaction {
  id: number;
  transaction_id: string;
  gateway: string;
  gateway_transaction_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  fee_amount: number | null;
  net_amount: number | null;
  paid_at: string | null;
  created_at: string;
  order: {
    id: number;
    order_number: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface Refund {
  id: number;
  refund_id: string;
  gateway_refund_id: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  reason_text: string | null;
  created_at: string;
  transaction: {
    id: number;
    transaction_id: string;
  };
  order: {
    id: number;
    order_number: string;
  };
}

interface PaymentStats {
  total_revenue: number;
  total_fees: number;
  total_refunds: number;
  net_revenue: number;
  transaction_count: number;
  refund_count: number;
  by_gateway: Record<string, { count: number; total: number }>;
  by_status: Record<string, { count: number }>;
}

const PaymentsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');

  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [refundReasonText, setRefundReasonText] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState<Transaction | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await paymentService.getStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getTransactions({
        status: statusFilter || undefined,
        gateway: gatewayFilter || undefined,
        per_page: rowsPerPage,
      });
      setTransactions(data.data || []);
      setTotalItems(data.total || 0);
    } catch (err: any) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gatewayFilter, rowsPerPage]);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getRefunds({
        per_page: rowsPerPage,
      });
      setRefunds(data.data || []);
    } catch (err: any) {
      setError('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tabValue === 0) {
      loadTransactions();
    } else if (tabValue === 1) {
      loadRefunds();
    }
  }, [tabValue, loadTransactions, loadRefunds]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenRefundDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRefundAmount(transaction.amount.toString());
    setRefundReason('requested_by_customer');
    setRefundReasonText('');
    setRefundDialogOpen(true);
  };

  const handleCloseRefundDialog = () => {
    setRefundDialogOpen(false);
    setSelectedTransaction(null);
    setRefundAmount('');
    setRefundReasonText('');
  };

  const handleProcessRefund = async () => {
    if (!selectedTransaction || !refundAmount) return;

    setRefundLoading(true);
    try {
      const result = await paymentService.createRefund(
        selectedTransaction.id,
        parseFloat(refundAmount),
        refundReason,
        refundReasonText
      );

      if (result.success) {
        setRefundDialogOpen(false);
        loadTransactions();
        loadStats();
      } else {
        setError(result.message || 'Failed to process refund');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleViewDetails = async (transactionId: string) => {
    try {
      const data = await paymentService.getTransaction(transactionId);
      setSelectedTransactionDetails(data);
      setDetailsDialogOpen(true);
    } catch (err: any) {
      setError('Failed to load transaction details');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'cancelled':
        return 'error';
      case 'refunded':
      case 'partially_refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const getGatewayIcon = (gateway: string) => {
    switch (gateway) {
      case 'stripe':
        return <CreditCardOutlined fontSize="small" />;
      case 'paypal':
        return <PaymentOutlined fontSize="small" />;
      default:
        return <PaymentOutlined fontSize="small" />;
    }
  };

  const filteredTransactions = transactions.filter((t) =>
    search
      ? t.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
        t.order?.order_number.toLowerCase().includes(search.toLowerCase()) ||
        t.user?.email.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Payment Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpOutlined sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Revenue
                    </Typography>
                    <Typography variant="h5">{formatCurrency(stats.total_revenue)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PaymentOutlined sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Net Revenue
                    </Typography>
                    <Typography variant="h5">{formatCurrency(stats.net_revenue)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CreditCardOutlined sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Fees
                    </Typography>
                    <Typography variant="h5">{formatCurrency(stats.total_fees)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <MoneyOffOutlined sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Refunds
                    </Typography>
                    <Typography variant="h5">{formatCurrency(stats.total_refunds)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Transactions (${stats?.transaction_count || 0})`} />
          <Tab label={`Refunds (${stats?.refund_count || 0})`} />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Box p={2} display="flex" gap={2} flexWrap="wrap">
              <TextField
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Gateway</InputLabel>
                <Select
                  value={gatewayFilter}
                  label="Gateway"
                  onChange={(e) => setGatewayFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                </Select>
              </FormControl>
              <Button startIcon={<RefreshOutlined />} onClick={() => loadTransactions()}>
                Refresh
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Gateway</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Fee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {transaction.transaction_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">#{transaction.order?.order_number}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getGatewayIcon(transaction.gateway)}
                            <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                              {transaction.gateway}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.fee_amount
                            ? formatCurrency(transaction.fee_amount, transaction.currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.status.replace('_', ' ')}
                            color={getStatusColor(transaction.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(transaction.transaction_id)}
                            >
                              <VisibilityOutlined />
                            </IconButton>
                          </Tooltip>
                          {(transaction.status === 'completed' ||
                            transaction.status === 'partially_refunded') && (
                            <Tooltip title="Refund">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenRefundDialog(transaction)}
                              >
                                <MoneyOffOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={totalItems}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Refund ID</TableCell>
                  <TableCell>Transaction</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : refunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No refunds found
                    </TableCell>
                  </TableRow>
                ) : (
                  refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {refund.refund_id}
                        </Typography>
                      </TableCell>
                      <TableCell>{refund.transaction?.transaction_id}</TableCell>
                      <TableCell>#{refund.order?.order_number}</TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {formatCurrency(refund.amount, refund.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {refund.reason.replace('_', ' ')}
                        </Typography>
                        {refund.reason_text && (
                          <Typography variant="caption" color="text.secondary">
                            {refund.reason_text}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={refund.status}
                          color={getStatusColor(refund.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(refund.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={handleCloseRefundDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Refunding transaction {selectedTransaction.transaction_id}
              </Alert>
              <Typography variant="body2" gutterBottom>
                Original Amount: {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
              </Typography>
              <TextField
                fullWidth
                label="Refund Amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                sx={{ mt: 2 }}
                inputProps={{
                  max: selectedTransaction.amount,
                  min: 0,
                  step: 0.01,
                }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Reason</InputLabel>
                <Select
                  value={refundReason}
                  label="Reason"
                  onChange={(e) => setRefundReason(e.target.value)}
                >
                  <MenuItem value="requested_by_customer">Requested by Customer</MenuItem>
                  <MenuItem value="duplicate">Duplicate Payment</MenuItem>
                  <MenuItem value="fraudulent">Fraudulent Transaction</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={3}
                value={refundReasonText}
                onChange={(e) => setRefundReasonText(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRefundDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleProcessRefund}
            disabled={refundLoading || !refundAmount}
          >
            {refundLoading ? <CircularProgress size={24} /> : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransactionDetails && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransactionDetails.transaction_id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedTransactionDetails.status.replace('_', ' ')}
                    color={getStatusColor(selectedTransactionDetails.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Gateway
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {selectedTransactionDetails.gateway}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {selectedTransactionDetails.payment_method || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(
                      selectedTransactionDetails.amount,
                      selectedTransactionDetails.currency
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fee
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransactionDetails.fee_amount
                      ? formatCurrency(
                          selectedTransactionDetails.fee_amount,
                          selectedTransactionDetails.currency
                        )
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Net Amount
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransactionDetails.net_amount
                      ? formatCurrency(
                          selectedTransactionDetails.net_amount,
                          selectedTransactionDetails.currency
                        )
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Paid At
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransactionDetails.paid_at
                      ? formatDate(selectedTransactionDetails.paid_at)
                      : 'N/A'}
                  </Typography>
                </Grid>
                {selectedTransactionDetails.user && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2">Customer</Typography>
                    <Typography variant="body2">{selectedTransactionDetails.user.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTransactionDetails.user.email}
                    </Typography>
                  </Grid>
                )}
                {selectedTransactionDetails.order && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Order</Typography>
                    <Typography variant="body2">
                      #{selectedTransactionDetails.order.order_number}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentsPage;
