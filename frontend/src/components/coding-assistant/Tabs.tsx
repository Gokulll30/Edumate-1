type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const tabs = [
  { id: "problems", label: "Problems" },
  { id: "explain", label: "Explain Code" },
  { id: "debug", label: "Debug Code" },
];

export default function Tabs({ activeTab, setActiveTab }: Props) {
  return (
    <div className="flex space-x-4 border-b border-slate-700">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`pb-3 px-4 font-medium ${
            activeTab === tab.id
              ? "text-indigo-400 border-b-2 border-indigo-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
