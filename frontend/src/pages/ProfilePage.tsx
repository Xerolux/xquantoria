import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Input,
  Modal,
  Alert,
  Descriptions,
  Tag,
  Divider,
  List,
  Progress,
  Table,
  Tooltip,
} from 'antd';
import {
  SafetyOutlined,
  KeyOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  DownloadOutlined,
  MobileOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LaptopOutlined,
  TabletOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { twoFactorService, sessionService } from '../services/api';
import type { UserSession } from '../types/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface RecoveryCode {
  code: string;
  copied: boolean;
}

const ProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 2FA Setup

  // 2FA Setup
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'show' | 'confirm'>('show');

  // 2FA Disable
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Recovery Codes
  const [recoveryCodesModalVisible, setRecoveryCodesModalVisible] = useState(false);
  const [displayRecoveryCodes, setDisplayRecoveryCodes] = useState<RecoveryCode[]>([]);

  useEffect(() => {
    fetchTwoFactorStatus();
    fetchSessions();
  }, []);

  const fetchTwoFactorStatus = async () => {
    try {
      const status = await twoFactorService.getStatus();
      setTwoFactorEnabled(status.enabled);
      setRecoveryCodesRemaining(status.recovery_codes_remaining);
    } catch (error) {
      console.error('Failed to fetch 2FA status');
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await sessionService.getAll();
      setSessions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (tokenId: number) => {
    try {
      await sessionService.revoke(tokenId);
      message.success('Session revoked successfully');
      fetchSessions();
    } catch (error) {
      message.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    Modal.confirm({
      title: 'Revoke All Sessions',
      content: 'Are you sure you want to revoke all other sessions? You will be logged out of all other devices.',
      okText: 'Revoke All',
      okType: 'danger',
      onOk: async () => {
        try {
          await sessionService.revokeAll();
          message.success('All other sessions revoked successfully');
          fetchSessions();
        } catch (error) {
          message.error('Failed to revoke sessions');
        }
      },
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <MobileOutlined />;
      case 'tablet':
        return <TabletOutlined />;
      case 'desktop':
      default:
        return <LaptopOutlined />;
    }
  };

  const handleEnableTwoFactor = async () => {
    setLoading(true);
    try {
      const data = await twoFactorService.setup();
      setSecret(data.secret);
      setRecoveryCodes(data.recovery_codes);

      // Generate QR code
      // Generate QR code URL (would require qrcode package)
      // For now, just use the QR code URL directly
      setQrCodeUrl(data.qr_code_url);

      setSetupStep('show');
      setSetupModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      message.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await twoFactorService.confirm(verificationCode);
      message.success('Two-factor authentication enabled successfully!');
      setSetupModalVisible(false);
      setVerificationCode('');
      fetchTwoFactorStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disablePassword) {
      message.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await twoFactorService.disable(disablePassword, disableCode);
      message.success('Two-factor authentication disabled');
      setDisableModalVisible(false);
      setDisablePassword('');
      setDisableCode('');
      fetchTwoFactorStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecoveryCodes = async () => {
    setLoading(true);
    try {
      const data = await twoFactorService.getRecoveryCodes();
      const codesWithCopyFlag = data.recovery_codes.map((code: string) => ({
        code,
        copied: false,
      }));
      setDisplayRecoveryCodes(codesWithCopyFlag);
      setRecoveryCodesModalVisible(true);
    } catch (error) {
      message.error('Failed to fetch recovery codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const text = displayRecoveryCodes.map((rc) => rc.code).join('\n');
    const blob = new Blob([`Two-Factor Authentication Recovery Codes\n\n${text}`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-codes-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Recovery codes downloaded');
  };

  const handleCopyRecoveryCode = (index: number) => {
    navigator.clipboard.writeText(displayRecoveryCodes[index].code);
    const updated = [...displayRecoveryCodes];
    updated[index].copied = true;
    setDisplayRecoveryCodes(updated);
    message.success('Copied to clipboard');

    setTimeout(() => {
      const reset = [...displayRecoveryCodes];
      reset[index].copied = false;
      setDisplayRecoveryCodes(reset);
    }, 2000);
  };

  const handleCopyAllRecoveryCodes = () => {
    const text = displayRecoveryCodes.map((rc) => rc.code).join('\n');
    navigator.clipboard.writeText(text);
    message.success('All recovery codes copied to clipboard');
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Profile Information">
            <Descriptions column={2}>
              <Descriptions.Item label="Name">{user?.display_name || user?.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color="blue">{user?.role}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {user?.is_active ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    Active
                  </Tag>
                ) : (
                  <Tag icon={<ExclamationCircleOutlined />} color="warning">
                    Inactive
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span>Two-Factor Authentication</span>
              </Space>
            }
            extra={
              <Tag color={twoFactorEnabled ? 'success' : 'default'}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Tag>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {twoFactorEnabled ? (
                <>
                  <Alert
                    type="success"
                    message="Two-factor authentication is enabled"
                    description="Your account is protected with 2FA. You'll need to enter a code from your authenticator app when logging in."
                    showIcon
                  />

                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Recovery Codes Remaining">
                      <Progress
                        percent={(recoveryCodesRemaining / 8) * 100}
                        format={() => `${recoveryCodesRemaining}/8`}
                        status={recoveryCodesRemaining < 3 ? 'exception' : 'normal'}
                      />
                    </Descriptions.Item>
                  </Descriptions>

                  <Space>
                    <Button icon={<KeyOutlined />} onClick={handleViewRecoveryCodes}>
                      View Recovery Codes
                    </Button>
                    <Button
                      danger
                      icon={<UnlockOutlined />}
                      onClick={() => setDisableModalVisible(true)}
                    >
                      Disable 2FA
                    </Button>
                  </Space>
                </>
              ) : (
                <>
                  <Alert
                    type="warning"
                    message="Two-factor authentication is not enabled"
                    description="Enable 2FA to add an extra layer of security to your account. You&apos;ll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator."
                    showIcon
                    closable
                  />

                  <Button
                    type="primary"
                    icon={<LockOutlined />}
                    onClick={handleEnableTwoFactor}
                    loading={loading}
                  >
                    Enable Two-Factor Authentication
                  </Button>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <MobileOutlined />
                <span>Active Sessions</span>
              </Space>
            }
            extra={
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleRevokeAllSessions}
                disabled={sessions.length <= 1}
              >
                Revoke All Other Sessions
              </Button>
            }
          >
            <Table
              dataSource={sessions}
              rowKey="id"
              loading={sessionsLoading}
              pagination={false}
              size="small"
            >
              <Table.Column
                title="Device"
                key="device"
                render={(_, record: UserSession) => (
                  <Space>
                    <span style={{ fontSize: 18 }}>
                      {getDeviceIcon(record.device_type)}
                    </span>
                    <span>
                      {record.browser} on {record.platform}
                    </span>
                  </Space>
                )}
              />
              <Table.Column
                title="IP Address"
                dataIndex="ip_address"
                key="ip_address"
                render={(ip: string) => (
                  <Space>
                    <GlobalOutlined />
                    <Tooltip title={ip}>
                      <span>{ip}</span>
                    </Tooltip>
                  </Space>
                )}
              />
              <Table.Column
                title="Last Activity"
                dataIndex="last_activity"
                key="last_activity"
                render={(date: string) => (
                  <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
                    <Space>
                      <ClockCircleOutlined />
                      <span>{dayjs(date).fromNow()}</span>
                    </Space>
                  </Tooltip>
                )}
              />
              <Table.Column
                title="Status"
                key="status"
                render={(_, record: UserSession) =>
                  record.is_current ? (
                    <Tag color="success">Current Session</Tag>
                  ) : (
                    <Tag>Other</Tag>
                  )
                }
              />
              <Table.Column
                title="Actions"
                key="actions"
                render={(_, record: UserSession) =>
                  !record.is_current && (
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRevokeSession(record.token_id)}
                    >
                      Revoke
                    </Button>
                  )
                }
              />
            </Table>
          </Card>
        </Col>
      </Row>

      {/* Setup Modal */}
      <Modal
        title="Setup Two-Factor Authentication"
        open={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setVerificationCode('');
          setQrCodeUrl('');
          setSecret('');
          setRecoveryCodes([]);
        }}
        footer={null}
        width={600}
      >
        {setupStep === 'show' && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              type="info"
              message="Step 1: Scan QR Code"
              description="Use your authenticator app (Google Authenticator, Authy, etc.) to scan the QR code below"
              showIcon
            />

            <div style={{ textAlign: 'center' }}>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{ width: 200, height: 200 }} />}
              <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
                Or enter this code manually:
              </div>
              <Text code copyable>{secret}</Text>
            </div>

            <Alert
              type="warning"
              message="Step 2: Save Recovery Codes"
              description="These codes are the only way to access your account if you lose your authenticator device. Save them somewhere safe!"
              showIcon
            />

            <List
              size="small"
              bordered
              dataSource={recoveryCodes}
              renderItem={(code: string) => (
                <List.Item>
                  <Space>
                    <Text code style={{ fontSize: 13 }}>{code}</Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        message.success('Copied');
                      }}
                    />
                  </Space>
                </List.Item>
              )}
            />

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setSetupModalVisible(false)}>Cancel</Button>
                <Button type="primary" onClick={() => setSetupStep('confirm')}>
                  Next
                </Button>
              </Space>
            </div>
          </Space>
        )}

        {setupStep === 'confirm' && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              type="info"
              message="Step 3: Verify"
              description="Enter the 6-digit code from your authenticator app to complete the setup"
              showIcon
            />

            <Input
              size="large"
              placeholder="123456"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: 8, fontSize: 24, textAlign: 'center', fontFamily: 'monospace' }}
            />

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setSetupStep('show')}>Back</Button>
                <Button
                  type="primary"
                  onClick={handleConfirmTwoFactor}
                  loading={loading}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Modal>

      {/* Disable Modal */}
      <Modal
        title="Disable Two-Factor Authentication"
        open={disableModalVisible}
        onOk={handleDisableTwoFactor}
        onCancel={() => {
          setDisableModalVisible(false);
          setDisablePassword('');
          setDisableCode('');
        }}
        confirmLoading={loading}
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            type="warning"
            message="Are you sure?"
            description="Disabling 2FA will make your account less secure. You can enable it again at any time."
            showIcon
          />

          <div>
            <div style={{ marginBottom: 8 }}>Password</div>
            <Input.Password
              placeholder="Enter your password to confirm"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8 }}>2FA Code (Optional)</div>
            <Input
              placeholder="Enter 6-digit code from authenticator"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              Leave empty if you don&apos;t have access to your authenticator
            </div>
          </div>
        </Space>
      </Modal>

      {/* Recovery Codes Modal */}
      <Modal
        title="Recovery Codes"
        open={recoveryCodesModalVisible}
        onCancel={() => setRecoveryCodesModalVisible(false)}
        footer={
          <Space>
            <Button onClick={handleCopyAllRecoveryCodes} icon={<CopyOutlined />}>
              Copy All
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadRecoveryCodes}>
              Download
            </Button>
            <Button type="primary" onClick={() => setRecoveryCodesModalVisible(false)}>
              Done
            </Button>
          </Space>
        }
      >
        <Alert
          type="warning"
          message="Keep these codes safe!"
          description="Each code can only be used once. Save them somewhere secure and private."
          showIcon
          style={{ marginBottom: 16 }}
        />

        <List
          size="small"
          bordered
          dataSource={displayRecoveryCodes}
          renderItem={(item: RecoveryCode, index: number) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text code style={{ fontSize: 13 }}>{item.code}</Text>
                <Button
                  type="text"
                  size="small"
                  icon={item.copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                  onClick={() => handleCopyRecoveryCode(index)}
                >
                  {item.copied ? 'Copied!' : 'Copy'}
                </Button>
              </Space>
            </List.Item>
          )}
        />

        <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
          <strong>Tip:</strong> Store these codes in a password manager or print them and keep them in a secure location.
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
