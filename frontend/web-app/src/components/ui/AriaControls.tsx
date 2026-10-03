'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  ComboBox,
  FieldError,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Text,
  TextArea,
  TextField,
  type Key,
} from 'react-aria-components';

export type Option = {
  id: string;
  name: string;
  description?: string;
  badge?: string;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: 'text' | 'search';
};

export function AriaTextField(props: FieldProps) {
  return (
    <TextField
      className="field-control"
      value={props.value}
      onChange={props.onChange}
      isRequired={props.isRequired}
      minLength={props.minLength}
      maxLength={props.maxLength}
      type={props.type}
    >
      <Label>{props.label}</Label>
      <Input placeholder={props.placeholder} />
      {props.description && <Text slot="description">{props.description}</Text>}
      <FieldError />
    </TextField>
  );
}

export function AriaTextArea(props: FieldProps & { rows?: number; trailing?: ReactNode }) {
  return (
    <TextField
      className="field-control field-textarea"
      value={props.value}
      onChange={props.onChange}
      isRequired={props.isRequired}
      minLength={props.minLength}
      maxLength={props.maxLength}
    >
      <Label>{props.label}{props.trailing}</Label>
      <TextArea placeholder={props.placeholder} rows={props.rows ?? 5} />
      {props.description && <Text slot="description">{props.description}</Text>}
      <FieldError />
    </TextField>
  );
}

type ComboFieldProps = {
  label: string;
  value: string;
  options: Option[];
  onInputChange: (value: string) => void;
  onSelect?: (option: Option | null) => void;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  allowsCustomValue?: boolean;
  isLoading?: boolean;
};

export function AriaComboField({
  label,
  value,
  options,
  onInputChange,
  onSelect,
  placeholder,
  description,
  isRequired,
  allowsCustomValue = true,
  isLoading = false,
}: ComboFieldProps) {
  return (
    <ComboBox<Option>
      className="field-control combo-control"
      inputValue={value}
      onInputChange={onInputChange}
      onChange={(key: Key | null) => {
        const selected = options.find((option) => option.id === String(key)) ?? null;
        if (selected) onInputChange(selected.name);
        onSelect?.(selected);
      }}
      allowsCustomValue={allowsCustomValue}
      allowsEmptyCollection
      menuTrigger="focus"
      isRequired={isRequired}
      defaultFilter={() => true}
    >
      <Label>{label}</Label>
      <Group>
        <Search size={16} aria-hidden="true" />
        <Input placeholder={placeholder} />
        <Button aria-label={`Show ${label.toLowerCase()} options`}><ChevronDown size={16} /></Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError />
      <Popover className="combo-popover">
        <ListBox<Option> items={options} className="combo-list" renderEmptyState={() => (
          <div className="combo-empty">{isLoading ? 'Searching…' : `Press Enter to use “${value}”`}</div>
        )}>
          {(item) => (
            <ListBoxItem id={item.id} textValue={item.name} className="combo-item">
              {({ isSelected }) => (
                <>
                  <span><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>
                  {item.badge && <em>{item.badge}</em>}
                  {isSelected && <Check size={15} aria-hidden="true" />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

export function HorizonSlider({ value, onChange, min, max }: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Slider
      className="timeline-slider"
      minValue={min}
      maxValue={max}
      step={1}
      value={value}
      onChange={(next) => onChange(Number(next))}
    >
      <div className="timeline-heading">
        <Label>Planning horizon</Label>
        <SliderOutput>{({ state }) => `${state.getThumbValue(0)}`}</SliderOutput>
      </div>
      <SliderTrack className="timeline-track">
        {({ state }) => (
          <>
            <div className="timeline-fill" style={{ width: `${state.getThumbPercent(0) * 100}%` }} />
            <SliderThumb className="timeline-thumb" aria-label="Horizon year" />
          </>
        )}
      </SliderTrack>
      <div className="timeline-years" aria-hidden="true"><span>{min}</span><span>{Math.round((min + max) / 2)}</span><span>{max}</span></div>
    </Slider>
  );
}

export { Button as AriaButton };
