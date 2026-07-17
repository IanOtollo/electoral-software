"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminDashboard() {
  // We will fetch tenants here once the API is wired up
  // const tenants = useQuery(api.tenants.list);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-cormorant font-semibold">Tenants</h2>
          <p className="text-sm text-(--foreground)/70 mt-1">
            Manage campaign clients and their module licenses.
          </p>
        </div>
        <button className="bg-(--accent) text-(--accent-foreground) px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity">
          + New Tenant
        </button>
      </div>

      <div className="bg-(--panel) border border-(--foreground)/10 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-(--foreground)/10 bg-(--foreground)/5">
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Tenant Name</th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Modules</th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--foreground)/10">
            {/* Placeholder for tenants */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Placeholder Campaign</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">active</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">Starter</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-xs">
                sms, tally
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <button className="text-(--accent) hover:underline font-medium">Manage</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
