import React from 'react';
import { 
  FaCreditCard, 
  FaUniversity, 
  FaQrcode, 
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUndoAlt
} from 'react-icons/fa';
import type { IconBaseProps } from 'react-icons';

interface PaymentIconProps extends IconBaseProps {
  iconName: string;
}

const iconMap: Record<string, React.ComponentType<IconBaseProps>> = {
  'FaCreditCard': FaCreditCard,
  'FaUniversity': FaUniversity,
  'FaQrcode': FaQrcode,
  'FaMoneyBillWave': FaMoneyBillWave,
  'FaCheckCircle': FaCheckCircle,
  'FaTimesCircle': FaTimesCircle,
  'FaClock': FaClock,
  'FaUndoAlt': FaUndoAlt
};

export const PaymentIcon: React.FC<PaymentIconProps> = ({ 
  iconName, 
  ...props 
}) => {
  const IconComponent = iconMap[iconName] || FaCreditCard;
  
  return <IconComponent {...props} />;
};

export default PaymentIcon;