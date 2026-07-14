'use client';

import { useState } from 'react';
import { type SimResult, type SimParams, type Leg } from '@/lib/simulator';
import { type BarData } from '@/lib/csv-parser';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewDashboard from './overview-dashboard';
import GreeksTab from './greeks-tab';
import HedgeLogTab from './hedge-log-tab';
import SensitivityMatrix from './sensitivity-matrix';
import ExportPanel from './export-panel';
import { LayoutDashboard, Activity, List, Grid3X3, Download } from 'lucide-react';

interface ResultsTabsProps {
  result: SimResult;
  bars: BarData[];
  legs: Leg[];
  params: SimParams;
}

export default function ResultsTabs({ result, bars, legs, params }: ResultsTabsProps) {
  const isNetShort = (result?.premiumCollected ?? 0) >= 0;
  const spec = params.contractSpec || CONTRACT_SPECS.GC;
  return (
    <div className="rounded-xl bg-card border border-border">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 pt-2 h-auto flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-lg px-4 py-2 text-sm gap-2">
            <LayoutDashboard className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="greeks" className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-lg px-4 py-2 text-sm gap-2">
            <Activity className="w-4 h-4" /> Greeks
          </TabsTrigger>
          <TabsTrigger value="hedge-log" className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-lg px-4 py-2 text-sm gap-2">
            <List className="w-4 h-4" /> Hedge Log
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-lg px-4 py-2 text-sm gap-2">
            <Grid3X3 className="w-4 h-4" /> Sensitivity
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-lg px-4 py-2 text-sm gap-2">
            <Download className="w-4 h-4" /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4">
          <OverviewDashboard result={result} contractSpec={spec} />
        </TabsContent>
        <TabsContent value="greeks" className="p-4">
          <GreeksTab result={result} contractSpec={spec} />
        </TabsContent>
        <TabsContent value="hedge-log" className="p-4">
          <HedgeLogTab result={result} isNetShort={isNetShort} contractSpec={spec} />
        </TabsContent>
        <TabsContent value="sensitivity" className="p-4">
          <SensitivityMatrix bars={bars} legs={legs} params={params} />
        </TabsContent>
        <TabsContent value="export" className="p-4">
          <ExportPanel result={result} contractSpec={spec} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
