import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  CreditCardOutlined,
  PayPalOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  LockOutlined,
  ShoppingCartOutlined,
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { paymentService, shopService } from '../services/api';

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  coupon_code?: string;
}

interface PaymentConfig {
  stripe: {
    enabled: boolean;
    publishable_key: string;
    test_mode: boolean;
  };
  paypal: {
    enabled: boolean;
    client_id: string;
    test_mode: boolean;
  };
  currency: string;
  tax_rate: number;
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const StripeCheckoutForm: React.FC<{
  clientSecret: string;
  orderId: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}> = ({ clientSecret, orderId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postal_code: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            address: {
              line1: billingDetails.address,
              city: billingDetails.city,
              postal_code: billingDetails.postal_code,
            },
          },
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        const result = await paymentService.confirmStripePayment(paymentIntent.id);
        if (result.success) {
          onSuccess();
        } else {
          onError(result.message || 'Payment confirmation failed');
        }
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Full Name"
            value={billingDetails.name}
            onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={billingDetails.email}
            onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            value={billingDetails.address}
            onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="City"
            value={billingDetails.city}
            onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Postal Code"
            value={billingDetails.postal_code}
            onChange={(e) => setBillingDetails({ ...billingDetails, postal_code: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Card Details
            </Typography>
            <CardElement options={cardElementOptions} />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={!stripe || processing}
            startIcon={processing ? <CircularProgress size={20} /> : <LockOutlined />}
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

const PayPalButton: React.FC<{
  clientId: string;
  orderId: number;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}> = ({ clientId, orderId, amount, currency, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handlePayPalCheckout = async () => {
    setLoading(true);
    try {
      const result = await paymentService.createPayPalOrder(orderId, {
        return_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`,
      });

      if (result.success && result.data.approval_url) {
        window.location.href = result.data.approval_url;
      } else {
        onError(result.message || 'Failed to create PayPal order');
      }
    } catch (err: any) {
      onError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      fullWidth
      size="large"
      onClick={handlePayPalCheckout}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={20} /> : <PayPalOutlined />}
      sx={{
        borderColor: '#003087',
        color: '#003087',
        '&:hover': {
          borderColor: '#001f5c',
          backgroundColor: 'rgba(0, 48, 135, 0.04)',
        },
      }}
    >
      {loading ? 'Redirecting...' : 'Pay with PayPal'}
    </Button>
  );
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [cart, setCart] = useState<Cart | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);

  const steps = ['Cart Review', 'Payment Method', 'Payment', 'Confirmation'];

  const loadData = useCallback(async () => {
    try {
      const [cartData, configData] = await Promise.all([
        shopService.getCart(),
        paymentService.getConfig(),
      ]);
      setCart(cartData);
      setConfig(configData);
    } catch (err: any) {
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProceedToPayment = async () => {
    if (!cart || cart.items.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderResult = await shopService.checkout({
        billing_name: '',
        billing_email: '',
        billing_address: '',
        billing_city: '',
        billing_postal_code: '',
        billing_country: '',
      });

      if (orderResult.success) {
        setOrderId(orderResult.order.id);
        setActiveStep(2);
      } else {
        setError(orderResult.message || 'Failed to create order');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeStripe = async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await paymentService.createStripeIntent(orderId);
      if (result.success) {
        setClientSecret(result.data.client_secret);
      } else {
        setError(result.message || 'Failed to initialize payment');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeStep === 2 && paymentMethod === 'stripe' && orderId) {
      handleInitializeStripe();
    }
  }, [activeStep, paymentMethod, orderId]);

  const handlePaymentSuccess = () => {
    setActiveStep(3);
    setOrderComplete(true);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (loading && !cart) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Box p={4}>
        <Alert severity="info" icon={<ShoppingCartOutlined />}>
          Your cart is empty. <Button onClick={() => navigate('/shop')}>Continue Shopping</Button>
        </Alert>
      </Box>
    );
  }

  const stripePromise = config?.stripe.enabled && config?.stripe.publishable_key
    ? loadStripe(config.stripe.publishable_key)
    : null;

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                <List>
                  {cart.items.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemAvatar>
                        <Avatar variant="rounded" src={item.image}>
                          <ShoppingOutlined />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.name}
                        secondary={`Quantity: ${item.quantity}`}
                      />
                      <Typography>
                        {formatCurrency(item.price * item.quantity, config?.currency)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setActiveStep(1)}
                    disabled={cart.items.length === 0}
                  >
                    Continue to Payment Method
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Payment Method
                </Typography>
                <FormControl component="fieldset">
                  <FormLabel component="legend">How would you like to pay?</FormLabel>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paypal')}
                  >
                    {config?.stripe.enabled && (
                      <FormControlLabel
                        value="stripe"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center">
                            <CreditCardOutlined sx={{ mr: 1 }} />
                            Credit / Debit Card
                            {config.stripe.test_mode && (
                              <Chip label="Test Mode" size="small" color="warning" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        }
                      />
                    )}
                    {config?.paypal.enabled && (
                      <FormControlLabel
                        value="paypal"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center">
                            <PayPalOutlined sx={{ mr: 1 }} />
                            PayPal
                            {config.paypal.test_mode && (
                              <Chip label="Test Mode" size="small" color="warning" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        }
                      />
                    )}
                  </RadioGroup>
                </FormControl>
                <Box display="flex" justifyContent="space-between" mt={3}>
                  <Button onClick={() => setActiveStep(0)}>Back</Button>
                  <Button variant="contained" color="primary" onClick={handleProceedToPayment}>
                    Proceed to Payment
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Complete Payment
                </Typography>
                {paymentMethod === 'stripe' && stripePromise && clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeCheckoutForm
                      clientSecret={clientSecret}
                      orderId={orderId!}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </Elements>
                ) : paymentMethod === 'stripe' ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : paymentMethod === 'paypal' && config?.paypal && orderId ? (
                  <PayPalButton
                    clientId={config.paypal.client_id}
                    orderId={orderId}
                    amount={cart.total}
                    currency={config.currency}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                ) : null}
                <Box mt={2}>
                  <Button onClick={() => setActiveStep(1)}>Back</Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeStep === 3 && (
            <Card>
              <CardContent>
                <Box textAlign="center" py={4}>
                  <CheckCircleOutlined sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Payment Successful!
                  </Typography>
                  <Typography color="text.secondary" paragraph>
                    Your order has been placed successfully. You will receive a confirmation email
                    shortly.
                  </Typography>
                  {orderId && (
                    <Typography variant="body2" color="text.secondary">
                      Order ID: #{orderId}
                    </Typography>
                  )}
                  <Box mt={3}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate('/shop/orders')}
                    >
                      View Orders
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Total
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography>{formatCurrency(cart.subtotal, config?.currency)}</Typography>
                </Box>
                {cart.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography color="text.secondary">Discount</Typography>
                    <Typography color="success.main">
                      -{formatCurrency(cart.discount, config?.currency)}
                    </Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">
                    Tax ({config?.tax_rate || 19}%)
                  </Typography>
                  <Typography>{formatCurrency(cart.tax, config?.currency)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(cart.total, config?.currency)}
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" color="text.secondary" mt={2}>
                <LockOutlined sx={{ fontSize: 16, mr: 1 }} />
                <Typography variant="body2">Secure checkout powered by SSL encryption</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CheckoutPage;
