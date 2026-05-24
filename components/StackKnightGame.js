// components/StackKnightGame.js

function StackKnightGame() {
    const canvasRef = React.useRef(null);
    const engineRef = React.useRef(null);

    const [gameState, setGameState] = React.useState('MENU'); // MENU, PLAYING, GAMEOVER, PAUSED
    const [score, setScore] = React.useState(0);
    const [combo, setCombo] = React.useState(0);
    const [finalScore, setFinalScore] = React.useState(0);
    const [spritesLoaded, setSpritesLoaded] = React.useState(false);
    const [highScore, setHighScore] = React.useState(0);
    const [showReviveAd, setShowReviveAd] = React.useState(false);
    const [gamesPlayed, setGamesPlayed] = React.useState(0);
    const [totalPlayTime, setTotalPlayTime] = React.useState(0);
    const [showFirstTimeTutorial, setShowFirstTimeTutorial] = React.useState(false);
    const [showPokiBanner, setShowPokiBanner] = React.useState(
        typeof window !== 'undefined' && 
        window.location.hostname.includes('netlify.app') &&
        !window.location.hostname.includes('poki')
    );

    // Touch jump tracking
    const lastTapRef = React.useRef(0);
    const tapCountRef = React.useRef(0);
    const sessionStartRef = React.useRef(Date.now());
    const gameTimeRef = React.useRef(0);

    // Preload sprites and load saved data on mount
    React.useEffect(() => {
        const preloadSprites = () => {
            const images = ['./trickle/assets/Stand.jpg', './trickle/assets/Jump.jpg'];
            let loadedCount = 0;

            images.forEach(src => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === images.length) {
                        setSpritesLoaded(true);
                    }
                };
                img.src = src;
            });
        };

        preloadSprites();

        // Load saved progress from Poki cloud
        if (window.pokiSDK) {
            window.pokiSDK.trackSessionStart();
            const saved = window.pokiSDK.loadProgress();
            if (saved) {
                setHighScore(saved.highScore || 0);
                setGamesPlayed(saved.gamesPlayed || 0);
                setTotalPlayTime(saved.totalPlayTime || 0);
                setShowFirstTimeTutorial(false); // They've played before
            } else {
                setShowFirstTimeTutorial(true); // First time player
            }
        }
    }, []);

    // Create engine on first PLAYING
    React.useEffect(() => {
        if (gameState === 'PLAYING' && canvasRef.current && !engineRef.current) {
            engineRef.current = new GameEngine(canvasRef.current, {
                onScore: (s, c) => {
                    setScore(s);
                    setCombo(c);
                },
                onGameOver: (s) => {
                    setFinalScore(s);
                    setGameState('GAMEOVER');
                }
            });
            engineRef.current.start();
        }
    }, [gameState === 'PLAYING']); // Only on first PLAYING

    // Destroy engine when leaving game (MENU or GAMEOVER)
    React.useEffect(() => {
        if ((gameState === 'MENU' || gameState === 'GAMEOVER') && engineRef.current) {
            engineRef.current.destroy();
            engineRef.current = null;
        }
    }, [gameState]);

    const startGame = () => {
        sessionStartRef.current = Date.now();
        gameTimeRef.current = 0;
        setGameState('PLAYING');
        setShowFirstTimeTutorial(false);
    };

    const resetGame = () => {
        // Save session end event and stats
        if (window.pokiSDK && finalScore > 0) {
            const sessionDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            window.pokiSDK.trackSessionEnd({
                duration: sessionDuration,
                score: finalScore
            });

            // Update high score
            const newHighScore = Math.max(highScore, finalScore);
            if (newHighScore > highScore) {
                setHighScore(newHighScore);
                window.pokiSDK.trackHighScore(newHighScore);
            }

            // Save progress
            window.pokiSDK.saveProgress({
                score: finalScore,
                highScore: newHighScore,
                gamesPlayed: gamesPlayed + 1,
                totalPlayTime: totalPlayTime + sessionDuration
            });
        }

        setGameState('MENU');
    };

    const handleReviveWithAd = () => {
        setShowReviveAd(true);
        if (window.pokiSDK) {
            window.pokiSDK.showRewardedAd((success) => {
                setShowReviveAd(false);
                if (success && engineRef.current) {
                    // Revive player
                    engineRef.current.revivePlayer();
                    window.pokiSDK.trackEvent('revive_success', { score: finalScore });
                } else {
                    window.pokiSDK.trackEvent('revive_skipped', { score: finalScore });
                }
            });
        } else {
            setShowReviveAd(false);
        }
    };

    const togglePause = () => {
        if (engineRef.current) {
            engineRef.current.isPaused = !engineRef.current.isPaused;
            setGameState(engineRef.current.isPaused ? 'PAUSED' : 'PLAYING');
        }
    };

    const handleCanvasClick = () => {
        // Tap to jump
        if (engineRef.current && gameState === 'PLAYING') {
            const now = Date.now();
            const timeDiff = now - lastTapRef.current;

            // Trigger space key for jump
            engineRef.current.input.keys['Space'] = true;
            setTimeout(() => {
                if (engineRef.current) {
                    engineRef.current.input.keys['Space'] = false;
                }
            }, 50);

            lastTapRef.current = now;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 font-sans select-none"
            style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, #2a1a3a 0%, #000 100%)'
            }}>

            {/* Poki Hub Banner */}
            {showPokiBanner && (
                <div className="w-full max-w-[320px] mb-3 bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-3 shadow-lg animate-pulse border border-purple-400">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <div className="text-white font-bold text-sm pixel-font">
                                Play on Poki
                            </div>
                            <div className="text-purple-100 text-xs mt-0.5">
                                Leaderboards, Achievements & More
                            </div>
                        </div>
                        <button
                            onClick={() => window.open('https://poki.com/en/g/stack-knight', '_blank')}
                            className="bg-white text-purple-700 px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap hover:bg-purple-100 transition-colors"
                        >
                            Play Now
                        </button>
                    </div>
                    <button
                        onClick={() => setShowPokiBanner(false)}
                        className="absolute top-1 right-1 text-purple-200 hover:text-white text-lg leading-none"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="game-container relative w-full max-w-[320px] h-auto aspect-[1/2] bg-black">
                {/* Canvas Layer */}
                <canvas
                    ref={canvasRef}
                    width={320}
                    height={640}
                    className="block w-full h-full cursor-pointer"
                    onClick={handleCanvasClick}
                />

                {/* HUD Layer (Only visible when playing or paused) */}
                {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
                    <>
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-right pointer-events-none">
                            <div className="text-white pixel-font text-sm sm:text-xl drop-shadow-md">
                                {score}
                            </div>
                            {combo > 1 && (
                                <div className="text-yellow-400 pixel-font text-xs sm:text-sm animate-pulse">
                                    COMBO x{combo}!
                                </div>
                            )}
                        </div>

                        {/* Pause Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePause();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                togglePause();
                            }}
                            className="absolute top-2 left-2 sm:top-4 sm:left-4 px-2 py-1 sm:px-3 sm:py-1 bg-blue-600 text-white text-xs pixel-font rounded hover:bg-blue-500 pointer-events-auto active:scale-95 transition-transform"
                        >
                            {gameState === 'PAUSED' ? 'RESUME' : 'PAUSE'}
                        </button>
                    </>
                )}

                {/* Controls Hint - Only show for first 15 seconds */}
                {gameState === 'PLAYING' && (
                    <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-40 hover:opacity-60 transition-opacity">
                        <div className="text-white pixel-font text-[10px]">
                            ← → MOVE • ↑ JUMP • TAP SCREEN
                        </div>
                    </div>
                )}

                {/* Pause Screen */}
                {gameState === 'PAUSED' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-10 text-center p-6 pointer-events-auto">
                        <h1 className="text-3xl text-blue-500 mb-8 pixel-font">PAUSED</h1>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePause();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                togglePause();
                            }}
                            className="btn-pixel mb-4"
                        >
                            RESUME
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                resetGame();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                resetGame();
                            }}
                            className="btn-pixel bg-red-600 hover:bg-red-500"
                        >
                            QUIT
                        </button>
                    </div>
                )}

                {/* Menu Screen */}
                {gameState === 'MENU' && !showFirstTimeTutorial && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 text-center p-6">
                        <h1 className="text-4xl text-blue-500 mb-2 pixel-font leading-tight"
                            style={{ textShadow: '4px 4px 0 #b84a4a' }}>
                            STACK<br />KNIGHT
                        </h1>
                        <p className="text-gray-400 mb-6 text-sm max-w-[200px]">
                            Climb the infinite tower. Stack blocks. Don't get crushed.
                        </p>

                        {highScore > 0 && (
                            <div className="bg-blue-900/40 p-3 rounded mb-6 w-full text-sm">
                                <div className="text-gray-400 text-xs uppercase mb-1">Personal Best</div>
                                <div className="text-2xl text-blue-300 pixel-font">{highScore}</div>
                            </div>
                        )}

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                startGame();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                startGame();
                            }}
                            className="btn-pixel mb-4"
                        >
                            Start Game
                        </button>

                        <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-gray-500">
                            <div className="flex flex-col items-center">
                                <div className="icon-arrow-left-right text-3xl mb-1"></div>
                                <span>Move</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="icon-arrow-up text-3xl mb-1"></div>
                                <span>Jump</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* First Time Tutorial - Quick & Interactive */}
                {gameState === 'MENU' && showFirstTimeTutorial && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-10 text-center p-6">
                        <h1 className="text-3xl text-blue-500 mb-4 pixel-font">
                            Welcome!
                        </h1>

                        <div className="bg-blue-900/40 p-4 rounded-lg mb-6 w-full">
                            <p className="text-white text-sm mb-4">
                                Jump on falling blocks to climb higher!
                            </p>
                            <p className="text-yellow-300 text-xs mb-3 pixel-font">
                                Stack perfectly for COMBOS
                            </p>
                            <p className="text-gray-400 text-xs">
                                Watch ads to revive when you fall
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full mb-6">
                            <div className="bg-black/60 p-3 rounded">
                                <div className="text-2xl mb-2">←→</div>
                                <div className="text-xs text-gray-400">Move</div>
                            </div>
                            <div className="bg-black/60 p-3 rounded">
                                <div className="text-2xl mb-2">↑</div>
                                <div className="text-xs text-gray-400">Jump</div>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                startGame();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                startGame();
                            }}
                            className="btn-pixel w-full"
                        >
                            Let's Go!
                        </button>
                    </div>
                )}

                {/* Game Over Screen */}
                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-md z-10 text-center p-6 animate-in fade-in duration-500">
                        <h2 className="text-3xl text-white mb-2 pixel-font">GAME OVER</h2>

                        <div className="bg-black/40 p-4 rounded-lg mb-6 w-full">
                            <div className="text-gray-400 text-xs uppercase mb-1">Final Score</div>
                            <div className="text-4xl text-yellow-400 pixel-font">{finalScore}</div>
                        </div>

                        {highScore > 0 && (
                            <div className="bg-blue-900/40 p-3 rounded mb-6 w-full text-sm">
                                <div className="text-gray-400 text-xs uppercase mb-1">Personal Best</div>
                                <div className="text-2xl text-blue-300 pixel-font">{highScore}</div>
                            </div>
                        )}

                        {!showReviveAd && (
                            <>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReviveWithAd();
                                    }}
                                    onTouchEnd={(e) => {
                                        e.stopPropagation();
                                        handleReviveWithAd();
                                    }}
                                    className="btn-pixel mb-3 w-full bg-green-600 hover:bg-green-500"
                                >
                                    Watch Ad to Revive
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startGame();
                                    }}
                                    onTouchEnd={(e) => {
                                        e.stopPropagation();
                                        startGame();
                                    }}
                                    className="btn-pixel mb-4 w-full"
                                >
                                    Try Again
                                </button>
                            </>
                        )}

                        {showReviveAd && (
                            <div className="text-white text-sm mb-4 animate-pulse">
                                Loading Ad...
                            </div>
                        )}

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                resetGame();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                resetGame();
                            }}
                            className="text-white/60 hover:text-white text-xs underline mt-2"
                        >
                            Back to Menu
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 text-gray-500 text-xs">
                With ❤ by Shubham Belle
            </div>
        </div>
    );
}