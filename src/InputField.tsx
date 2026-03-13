import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Описываем интерфейс пропсов
interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const InputField = ({ 
  icon, 
  label, 
  type, 
  value, 
  onChange, 
  placeholder, 
  required, 
  error 
}: InputFieldProps) => ( // Теперь здесь используется строгий тип вместо any
  <div className="text-left w-full">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {icon} {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full bg-muted border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all ${error ? 'border-destructive ring-1 ring-destructive/50' : 'border-border'}`}
      style={{ fontSize: '16px' }}
    />
    {error && (
      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

export default InputField;