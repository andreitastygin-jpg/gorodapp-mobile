import React from 'react';
import { Text, TextStyle, TextProps } from 'react-native';

interface AppTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'title' | 'body' | 'caption' | 'mono';
  color?: string;
  weight?: 'normal' | 'medium' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  variant = 'body',
  color = '#1f2937',
  weight = 'normal',
  align = 'left',
  style,
  ...props
}) => {
  const getStyles = () => {
    const textStyle: TextStyle = {
      color,
      textAlign: align,
    };
    if (variant === 'h1') {
      textStyle.fontSize = 24;
      textStyle.fontWeight = '700';
    } else if (variant === 'h2') {
      textStyle.fontSize = 20;
      textStyle.fontWeight = '600';
    } else if (variant === 'title') {
      textStyle.fontSize = 16;
      textStyle.fontWeight = '600';
    } else if (variant === 'caption') {
      textStyle.fontSize = 12;
      textStyle.color = '#6b7280';
    } else if (variant === 'mono') {
      textStyle.fontSize = 13;
      textStyle.fontFamily = 'monospace';
    } else {
      textStyle.fontSize = 14;
    }

    if (weight === 'bold') textStyle.fontWeight = '700';
    else if (weight === 'medium') textStyle.fontWeight = '500';

    return textStyle;
  };

  return (
    <Text style={[getStyles(), style]} {...props}>
      {children}
    </Text>
  );
};
export default AppText;
