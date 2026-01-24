"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DatabaseType = "mysql" | "postgresql" | "mongodb" | "redis";
type ConnectionStatus = "idle" | "connected" | "failed";

interface DatabaseConnectionProps {
  onConnection: (status: ConnectionStatus, dbInfo?: any) => void;
}

const databaseTypes = [
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mongodb", label: "MongoDB" },
  { value: "redis", label: "Redis" },
];

export function DatabaseConnection({ onConnection }: DatabaseConnectionProps) {
  const [selectedDb, setSelectedDb] = useState<DatabaseType | "">("");
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [formData, setFormData] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    database: "",
    connectionString: "",
    token: "",
    engine: "",
  });

  const handleConnect = async () => {
    setConnectionStatus("testing");
    const params = new URLSearchParams({
      user: formData.username,
      password: formData.password,
      host: formData.host,
      port: formData.port,
      database: formData.database,
      engine: selectedDb,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL}/db-connection-status`,
        {
          signal: controller.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: formData.username,
            password: formData.password,
            host: formData.host,
            port: formData.port,
            database: formData.database,
            engine: selectedDb,
          }),
        },
      );
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.status === "connected") {
        setConnectionStatus("success");
        onConnection("connected", formData);
      } else {
        setConnectionStatus("error");
        onConnection("failed");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setConnectionStatus("error");
      onConnection("failed");
    }
  };

  const isRelationalDb = selectedDb === "mysql" || selectedDb === "postgresql";
  const isNoSqlDb = selectedDb === "mongodb" || selectedDb === "redis";

  const renderConnectionFields = () => {
    if (isRelationalDb) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              placeholder="DB HOST"
              value={formData.host}
              onChange={(e) =>
                setFormData({ ...formData, host: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              placeholder="PORT"
              value={formData.port}
              onChange={(e) =>
                setFormData({ ...formData, port: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="USERNAME"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="PASSWORD"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              placeholder="DATABASE"
              value={formData.database}
              onChange={(e) =>
                setFormData({ ...formData, database: e.target.value })
              }
            />
          </div>
        </div>
      );
    }

    if (isNoSqlDb) {
      return (
        <div className="space-y-4">
          {selectedDb === "mongodb" && (
            <div className="space-y-2">
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                placeholder="mongodb://username:password@host:port/database"
                value={formData.connectionString}
                onChange={(e) =>
                  setFormData({ ...formData, connectionString: e.target.value })
                }
              />
            </div>
          )}
          {selectedDb === "redis" && (
            <div className="space-y-2">
              <Label htmlFor="token">Connection Token</Label>
              <Input
                id="token"
                placeholder="redis://username:password@host:port"
                value={formData.token}
                onChange={(e) =>
                  setFormData({ ...formData, token: e.target.value })
                }
              />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Database Connection</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Select your database type and provide connection details
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Configure your database connection to begin security scanning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dbType">Database Type</Label>
            <Select
              value={selectedDb}
              onValueChange={(value: DatabaseType) => {
                setSelectedDb(value);
                setFormData({ ...formData, engine: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                {databaseTypes.map((db) => (
                  <SelectItem key={db.value} value={db.value}>
                    {db.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDb && renderConnectionFields()}

          {selectedDb && (
            <div className="pt-4">
              <Button
                onClick={handleConnect}
                className="w-full md:w-auto"
                disabled={connectionStatus === "testing"}
              >
                {connectionStatus === "testing"
                  ? "Testing Connection..."
                  : "Test Connection"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {connectionStatus !== "idle" && connectionStatus !== "testing" && (
        <Alert
          variant={connectionStatus === "success" ? "default" : "destructive"}
        >
          {connectionStatus === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {connectionStatus === "success"
              ? "Connection successful! You can now proceed to scan configuration."
              : "Connection failed. Please check your credentials and try again."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
