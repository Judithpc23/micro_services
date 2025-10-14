"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface RobleTableSelectorProps {
  onTableSelect: (tableName: string) => void
  selectedTable?: string
}

export function RobleTableSelector({ 
  onTableSelect, 
  selectedTable
}: RobleTableSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tableName">Table Name</Label>
      <Input
        id="tableName"
        placeholder="Enter table name (e.g., users, products, orders)"
        value={selectedTable || ""}
        onChange={(e) => onTableSelect(e.target.value)}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Enter the exact name of the table in your Roble database
      </p>
    </div>
  )
}
