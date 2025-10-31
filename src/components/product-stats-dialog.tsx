"use client"

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart as BarChartIcon } from "lucide-react";

interface ProductStats {
  id: string;
  title: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

interface ProductStatsDialogProps {
  productStats?: ProductStats;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function ProductStatsDialog({ productStats }: ProductStatsDialogProps) {
  const title = productStats?.title ?? "Product";
  const totalQuantitySold = productStats?.totalQuantitySold ?? 0;
  const totalRevenue = productStats?.totalRevenue ?? 0;

  const data = [
    { name: 'Quantity Sold', value: totalQuantitySold },
    { name: 'Revenue', value: totalRevenue },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs sm:text-sm px-2 sm:px-3">
          <BarChartIcon size={12} className="mr-1" />
          <span className="hidden sm:inline">Stats</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} - Statistics</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{totalQuantitySold}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductStatsDialog;
