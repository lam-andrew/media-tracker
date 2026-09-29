import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

type Option = {
  value: string | number;
  children: ReactNode;
  disabled?: boolean;
};
type Props = {
  value: string | number;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
};
/** One themed, keyboard-accessible selector for filters, forms, and import matches. */
export function Select({
  value,
  onChange,
  children,
  disabled,
  "aria-label": label,
}: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const options = Children.toArray(children).filter(isValidElement<Option>);
  return (
    <Primitive.Root
      value={`value:${value}`}
      onValueChange={(v) => onChange({ target: { value: v.slice(6) } })}
      disabled={disabled}
      onOpenChange={(open) => {
        if (open)
          setContainer(
            trigger.current?.closest<HTMLElement>("dialog, .world") ?? null,
          );
      }}
    >
      <Primitive.Trigger
        ref={trigger}
        className="select-trigger"
        aria-label={label}
      >
        <Primitive.Value />
        <Primitive.Icon className="select-chevron">
          <ChevronDown size={15} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal container={container}>
        <Primitive.Content
          className="select-menu"
          position="popper"
          sideOffset={8}
          collisionPadding={12}
        >
          <Primitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={14} />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className="select-options">
            {options.map((o) => (
              <Primitive.Item
                className="select-option"
                key={String(o.props.value)}
                value={`value:${o.props.value}`}
                disabled={o.props.disabled}
              >
                <Primitive.ItemText>{o.props.children}</Primitive.ItemText>
                <Primitive.ItemIndicator className="select-check">
                  <Check size={15} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={14} />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
