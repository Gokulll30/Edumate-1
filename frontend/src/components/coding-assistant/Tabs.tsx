type Props = {
  activeTab: string;
  setActiveTab: (tab: any) => void;
};

export default function Tabs({ activeTab, setActiveTab }: Props) {
  const tabs = [
    { id: "problems", label: "Problems" },
    { id: "editor", label: "Code Editor" },
    { id: "results", label: "Results" },
  ];

  return (
    <div className="flex space-x-4 border-b border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`pb-2 px-4 font-medium ${
            activeTab === tab.id
              ? "border-b-2 border-indigo-500 text-indigo-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
