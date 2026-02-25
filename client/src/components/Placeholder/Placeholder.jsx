function Placeholder({ title, description, icon = 'construction' }) {
    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 flex items-center justify-center min-h-[60vh]">
            <div className="glass-panel rounded-2xl p-12 text-center max-w-md">
                <div className="size-20 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary">{icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                <p className="text-slate-400 text-sm">{description}</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm">engineering</span>
                    În lucru...
                </div>
            </div>
        </main>
    );
}

export default Placeholder;
