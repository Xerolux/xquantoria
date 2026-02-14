import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Rate,
  Input,
  Select,
  Pagination,
  Spin,
  Empty,
  Badge,
  message,
  Tabs,
  Table,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  List,
  Divider,
  Steps,
  Checkbox,
} from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { shopService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  short_description: string;
  featured_image_id: number;
  is_featured: boolean;
  stock_quantity: number;
  category: { id: number; name: string } | null;
  average_rating?: number;
  review_count?: number;
}

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

const ShopPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number; item_count: number }>({ items: [], subtotal: 0, item_count: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [checkoutForm] = Form.useForm();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadCart();
  }, [currentPage, selectedCategory, sortBy]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: pageSize,
        sort_by: sortBy,
        sort_order: 'desc',
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      const response = await shopService.getProducts(params);
      setProducts(response.data || []);
      setTotalProducts(response.total || 0);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await shopService.getCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCart = async () => {
    try {
      const response = await shopService.getCart();
      setCart(response);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await shopService.getOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await shopService.addToCart(productId, 1);
      loadCart();
      message.success('Zum Warenkorb hinzugefügt');
    } catch (error) {
      message.error('Fehler beim Hinzufügen');
    }
  };

  const handleUpdateQuantity = async (key: string, quantity: number) => {
    try {
      await shopService.updateCartItem(key, quantity);
      loadCart();
    } catch (error) {
      message.error('Fehler beim Aktualisieren');
    }
  };

  const handleRemoveFromCart = async (key: string) => {
    try {
      await shopService.removeFromCart(key);
      loadCart();
      message.success('Produkt entfernt');
    } catch (error) {
      message.error('Fehler beim Entfernen');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const response = await shopService.applyCoupon(couponCode);
      setAppliedCoupon(response.coupon);
      message.success(`Gutschein angewendet: -${response.discount} EUR`);
    } catch (error) {
      message.error('Ungültiger Gutscheincode');
    }
  };

  const handleCheckout = async (values: any) => {
    try {
      const checkoutData = {
        ...values,
        coupon_code: appliedCoupon?.code,
        billing_address: {
          first_name: values.billing_first_name,
          last_name: values.billing_last_name,
          email: values.billing_email,
          phone: values.billing_phone,
          street: values.billing_street,
          city: values.billing_city,
          postcode: values.billing_postcode,
          country: values.billing_country,
        },
        shipping_address: values.different_shipping ? {
          first_name: values.shipping_first_name,
          last_name: values.shipping_last_name,
          street: values.shipping_street,
          city: values.shipping_city,
          postcode: values.shipping_postcode,
          country: values.shipping_country,
        } : undefined,
      };

      await shopService.checkout(checkoutData);
      setCheckoutStep(2);
      loadCart();
      message.success('Bestellung erfolgreich!');
    } catch (error) {
      message.error('Fehler bei der Bestellung');
    }
  };

  const getCurrentPrice = (product: Product) => {
    return product.sale_price || product.price;
  };

  const renderProducts = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="Produkte suchen..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={loadProducts}
            />
          </Col>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Kategorie"
              allowClear
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
            >
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              value={sortBy}
              onChange={(val) => setSortBy(val)}
            >
              <Option value="created_at">Neueste</Option>
              <Option value="price">Preis (aufsteigend)</Option>
              <Option value="-price">Preis (absteigend)</Option>
              <Option value="name">Name</Option>
            </Select>
          </Col>
        </Row>
      </div>

      <Spin spinning={loading}>
        {products.length === 0 ? (
          <Empty description="Keine Produkte gefunden" />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((product) => (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {product.is_featured && (
                        <Tag color="gold" style={{ position: 'absolute', top: 8, left: 8 }}>Empfohlen</Tag>
                      )}
                      {product.sale_price && (
                        <Tag color="red" style={{ position: 'absolute', top: 8, right: 8 }}>Sale</Tag>
                      )}
                      <Text type="secondary">Kein Bild</Text>
                    </div>
                  }
                  actions={[
                    <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => handleAddToCart(product.id)}>
                      In den Warenkorb
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={product.name}
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          {product.sale_price ? (
                            <Space>
                              <Text delete type="secondary">{product.price.toFixed(2)} EUR</Text>
                              <Text strong style={{ color: '#f5222d' }}>{product.sale_price.toFixed(2)} EUR</Text>
                            </Space>
                          ) : (
                            <Text strong>{product.price.toFixed(2)} EUR</Text>
                          )}
                        </div>
                        {product.category && (
                          <Tag>{product.category.name}</Tag>
                        )}
                        {product.stock_quantity <= 0 && (
                          <Tag color="red">Ausverkauft</Tag>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {totalProducts > pageSize && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Pagination
            current={currentPage}
            total={totalProducts}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger
            onShowSizeChange={(_, size) => setPageSize(size)}
          />
        </div>
      )}
    </div>
  );

  const renderCart = () => {
    const shipping = cart.subtotal >= 50 ? 0 : 4.99;
    const discount = appliedCoupon?.discount || 0;
    const total = cart.subtotal + shipping - discount;

    return (
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title={`Warenkorb (${cart.item_count} Artikel)`}>
            {cart.items.length === 0 ? (
              <Empty description="Warenkorb ist leer" />
            ) : (
              <List
                dataSource={Object.entries(cart.items)}
                renderItem={([key, item]: [string, any]) => (
                  <List.Item
                    actions={[
                      <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(key)} />,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.name}
                      description={`${item.price.toFixed(2)} EUR`}
                    />
                    <Space>
                      <Button icon={<MinusOutlined />} onClick={() => handleUpdateQuantity(key, item.quantity - 1)} />
                      <Text>{item.quantity}</Text>
                      <Button icon={<PlusOutlined />} onClick={() => handleUpdateQuantity(key, item.quantity + 1)} />
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Zusammenfassung">
            <Descriptions column={1}>
              <Descriptions.Item label="Zwischensumme">{cart.subtotal.toFixed(2)} EUR</Descriptions.Item>
              <Descriptions.Item label="Versand">
                {shipping === 0 ? <Tag color="green">Kostenlos</Tag> : `${shipping.toFixed(2)} EUR`}
              </Descriptions.Item>
              {appliedCoupon && (
                <Descriptions.Item label="Rabatt">
                  <Text type="success">-{discount.toFixed(2)} EUR</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Gesamt">
                <Title level={4}>{total.toFixed(2)} EUR</Title>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                placeholder="Gutscheincode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <Button type="primary" onClick={handleApplyCoupon}>Anwenden</Button>
            </Space.Compact>

            <Button
              type="primary"
              size="large"
              block
              icon={<CreditCardOutlined />}
              disabled={cart.items.length === 0}
              onClick={() => setCheckoutModalVisible(true)}
            >
              Zur Kasse
            </Button>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderOrders = () => {
    const columns = [
      { title: 'Bestellnummer', dataIndex: 'order_number', key: 'order_number' },
      { title: 'Datum', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleDateString('de-DE') },
      { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
        const colors: Record<string, string> = { pending: 'default', processing: 'blue', completed: 'green', cancelled: 'red' };
        const labels: Record<string, string> = { pending: 'Ausstehend', processing: 'In Bearbeitung', completed: 'Abgeschlossen', cancelled: 'Storniert' };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      }},
      { title: 'Gesamt', dataIndex: 'total', key: 'total', render: (val: number) => `${val.toFixed(2)} EUR` },
    ];

    return (
      <Card title="Meine Bestellungen">
        <Table columns={columns} dataSource={orders} rowKey="id" />
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Shop</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          <Badge count={cart.item_count} offset={[-5, 5]}>
            <Button icon={<ShoppingCartOutlined />} onClick={() => setActiveTab('cart')}>
              Warenkorb
            </Button>
          </Badge>
        }
        items={[
          { key: 'products', label: 'Produkte', children: renderProducts() },
          { key: 'cart', label: 'Warenkorb', children: renderCart() },
          { key: 'orders', label: 'Bestellungen', children: renderOrders() },
        ]}
      />

      <Modal
        title="Checkout"
        open={checkoutModalVisible}
        onCancel={() => {
          setCheckoutModalVisible(false);
          setCheckoutStep(0);
        }}
        footer={null}
        width={700}
      >
        <Steps
          current={checkoutStep}
          items={[
            { title: 'Adressdaten' },
            { title: 'Zahlung' },
            { title: 'Fertig' },
          ]}
          style={{ marginBottom: 24 }}
        />

        {checkoutStep === 2 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <Title level={3} style={{ marginTop: 16 }}>Bestellung erfolgreich!</Title>
            <Text>Sie erhalten eine Bestätigungs-E-Mail.</Text>
            <Button type="primary" style={{ marginTop: 24 }} onClick={() => {
              setCheckoutModalVisible(false);
              setCheckoutStep(0);
              setActiveTab('orders');
            }}>
              Zu meinen Bestellungen
            </Button>
          </div>
        ) : (
          <Form form={checkoutForm} layout="vertical" onFinish={handleCheckout}>
            <Title level={5}>Rechnungsadresse</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="billing_first_name" label="Vorname" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="billing_last_name" label="Nachname" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="billing_email" label="E-Mail" rules={[{ required: true, type: 'email' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="billing_phone" label="Telefon">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="billing_street" label="Straße & Hausnummer" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="billing_postcode" label="PLZ" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="billing_city" label="Stadt" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="billing_country" label="Land" rules={[{ required: true }]} initialValue="DE">
              <Select>
                <Option value="DE">Deutschland</Option>
                <Option value="AT">Österreich</Option>
                <Option value="CH">Schweiz</Option>
              </Select>
            </Form.Item>

            <Form.Item name="different_shipping" valuePropName="checked">
              <Checkbox>Abweichende Lieferadresse</Checkbox>
            </Form.Item>

            <Title level={5} style={{ marginTop: 16 }}>Zahlungsmethode</Title>
            <Form.Item name="payment_method" rules={[{ required: true }]}>
              <Select placeholder="Bitte wählen">
                <Option value="invoice">Rechnung</Option>
                <Option value="paypal">PayPal</Option>
                <Option value="creditcard">Kreditkarte</Option>
                <Option value="sepa">SEPA-Lastschrift</Option>
              </Select>
            </Form.Item>

            <Form.Item name="customer_notes" label="Anmerkungen">
              <TextArea rows={3} placeholder="Optionale Anmerkungen zur Bestellung..." />
            </Form.Item>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCheckoutModalVisible(false)}>Abbrechen</Button>
              <Button type="primary" htmlType="submit">Bestellung abschließen</Button>
            </Space>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ShopPage;
