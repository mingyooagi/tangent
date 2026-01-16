import type { HTMLAttributes, ElementType, ReactNode } from "react";

interface TangentRootProps {
  tangent: { tangentProps: { "data-tangent-id": string } };
  as?: ElementType;
  children?: ReactNode;
}

export function TangentRoot({
  tangent,
  as: Component = "div",
  children,
  ...rest
}: TangentRootProps & HTMLAttributes<HTMLElement>) {
  return (
    <Component {...tangent.tangentProps} {...rest}>
      {children}
    </Component>
  );
}
