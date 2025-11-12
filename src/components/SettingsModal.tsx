import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Key, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBedrockConfigUpdate: (region?: string, modelId?: string) => void;
  onTestConnection: () => Promise<boolean>;
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #6b7280;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const Button = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  ` : `
    background: #f3f4f6;
    color: #374151;
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusIndicator = styled.div<{ status: 'success' | 'error' | 'testing' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 8px;
  
  ${props => {
    switch (props.status) {
      case 'success':
        return `
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        `;
      case 'error':
        return `
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        `;
      case 'testing':
        return `
          background: #fefbf2;
          color: #d97706;
          border: 1px solid #fed7aa;
        `;
    }
  }}
`;

const InfoBox = styled.div`
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

const InfoTitle = styled.h4`
  margin: 0 0 8px 0;
  color: #0369a1;
  font-size: 14px;
`;

const InfoText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.4;
`;

const Link = styled.a`
  color: #667eea;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onBedrockConfigUpdate,
  onTestConnection
}) => {
  const [region, setRegion] = useState(process.env.AWS_DEFAULT_REGION || 'us-east-1');
  const [modelId, setModelId] = useState(process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-5-20250929-v1:0');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSave = () => {
    onBedrockConfigUpdate(region, modelId);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    if (!region.trim()) {
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    
    try {
      const isConnected = await onTestConnection();
      setTestStatus(isConnected ? 'success' : 'error');
    } catch (error) {
      setTestStatus('error');
    }
  };

  const getStatusMessage = () => {
    switch (testStatus) {
      case 'testing':
        return { icon: <Key size={16} />, text: 'Testing connection...' };
      case 'success':
        return { icon: <CheckCircle size={16} />, text: 'Bedrock connection successful! Smart responses enabled.' };
      case 'error':
        return { icon: <AlertCircle size={16} />, text: 'Connection failed. Check your AWS credentials and Bedrock access.' };
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Modal
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title>
                <Settings size={20} />
                Settings
              </Title>
              <CloseButton onClick={onClose}>
                <X size={20} />
              </CloseButton>
            </Header>

            <InfoBox>
              <InfoTitle>🚀 Enhanced AI with AWS Bedrock</InfoTitle>
              <InfoText>
                Configure your AWS Bedrock settings to unlock advanced AI responses using Claude 3! 
                Make sure your AWS credentials are configured via the .env file or AWS CLI. 
                Learn more at{' '}
                <Link href="https://docs.aws.amazon.com/bedrock/" target="_blank" rel="noopener noreferrer">
                  AWS Bedrock Documentation
                </Link>
              </InfoText>
            </InfoBox>

            <Section>
              <Label>AWS Region</Label>
              <Description>
                The AWS region where Bedrock is available (e.g., us-east-1, us-west-2).
              </Description>
              <InputGroup>
                <Input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="us-east-1"
                />
              </InputGroup>
            </Section>

            <Section>
              <Label>Bedrock Model ID</Label>
              <Description>
                The specific Claude model to use. Claude 3 Sonnet is recommended for balanced performance.
              </Description>
              <InputGroup>
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="anthropic.claude-3-sonnet-20240229-v1:0"
                />
              </InputGroup>

              {testStatus !== 'idle' && (
                <StatusIndicator status={testStatus === 'testing' ? 'testing' : testStatus}>
                  {getStatusMessage()?.icon}
                  {getStatusMessage()?.text}
                </StatusIndicator>
              )}
            </Section>

            <ButtonGroup>
              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={!region.trim() || testStatus === 'testing'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Key size={14} />
                Test Connection
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save
              </Button>
            </ButtonGroup>
          </Modal>
        </Overlay>
      )}
    </AnimatePresence>
  );
};