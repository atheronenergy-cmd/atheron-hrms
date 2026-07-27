import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Input } from "./input";

export interface SearchBoxProps extends React.ComponentProps<typeof Input> {
  onSearch?: (value: string) => void;
}

const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ className, onSearch, onChange, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        className="pl-9"
        onChange={(e) => {
          onChange?.(e);
          onSearch?.(e.target.value);
        }}
        {...props}
      />
    </div>
  ),
);
SearchBox.displayName = "SearchBox";

export { SearchBox };
