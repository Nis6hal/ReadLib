import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  ArrowRight,
  Flame,
  Target,
  Library,
  Plus,
  User,
  Rocket,
  Globe,
} from "lucide-react";
import { useLibrary } from "../context/LibraryContext";
import BookCard from "../components/BookCard";
import AuthorDetailModal from "../components/AuthorDetailModal";
import AddManualBookModal from "../components/AddManualBookModal";
import "../App.css";
import "./Home.css";

import {
  Filter,
  FlaskConical,
  BookMarked,
  MoreHorizontal,
  Brain,
} from "lucide-react";

import { BookCardSkeleton, GenreCardSkeleton } from "../components/Skeleton";

function ReadingHeatmap({ history }) {
  const now = new Date();
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build weekly rows: go back up to 28 days, chunk into 7-day weeks
  const allDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (27 - i));
    const dateStr = d.toLocaleDateString("en-CA");
    const pages = history[dateStr] || 0;
    let level = 0;
    if (pages > 0) level = 1;
    if (pages > 20) level = 2;
    if (pages > 50) level = 3;
    if (pages > 100) level = 4;
    return { date: dateStr, pages, level, day: d.getDay() }; // 0=Sun
  });

  // Chunk into weeks (Sun-Sat), pad first week
  const weeks = [];
  let week = [];
  for (const day of allDays) {
    week.push(day);
    if (day.day === 6) {
      // Saturday ends the week
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  // Pad short weeks to 7 cells for alignment
  while (weeks.length > 0 && weeks[0].length < 7) {
    weeks[0].unshift(null);
  }

  const pagesThisWeek = allDays
    .filter((d) => d.pages > 0)
    .slice(-7)
    .reduce((sum, d) => sum + d.pages, 0);

  return (
    <div className="reading-activity card">
      <div className="activity-header">
        <div>
          <h3>Reading Consistency</h3>
          <p>Activity over the last 4 weeks</p>
        </div>
        {pagesThisWeek > 0 && (
          <div className="week-pages-badge">
            <BookOpen size={14} />
            <span>{pagesThisWeek} pages this week</span>
          </div>
        )}
      </div>
      <div className="heatmap-container">
        <div className="heatmap-layout">
          <div className="heatmap-day-labels">
            {dayLabels.map((label) => (
              <span key={label} className="heatmap-day-label">
                {label}
              </span>
            ))}
          </div>
          <div className="heatmap-weeks">
            {weeks.map((w, wi) => (
              <div key={wi} className="heatmap-week-row">
                {w.map((d, di) =>
                  d ? (
                    <div
                      key={d.date}
                      className={`heatmap-cell level-${d.level}`}
                      title={`${d.date}: ${d.pages} pages`}
                    >
                      {d.pages > 0 && (
                        <span className="cell-tooltip">{d.pages} pages</span>
                      )}
                    </div>
                  ) : (
                    <div key={di} className="heatmap-cell empty" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-cells">
            <div className="heatmap-cell level-0"></div>
            <div className="heatmap-cell level-1"></div>
            <div className="heatmap-cell level-2"></div>
            <div className="heatmap-cell level-3"></div>
            <div className="heatmap-cell level-4"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const {
    books,
    loading,
    selectDirectory,
    readingHistory,
    yearlyGoal,
    calculateStreak,
    userName,
  } = useLibrary();
  const navigate = useNavigate();
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const streak = calculateStreak();
  const booksReadThisYear = books.filter(
    (b) =>
      b.category === "Completed" &&
      b.lastRead &&
      new Date(b.lastRead).getFullYear() === new Date().getFullYear(),
  ).length;
  const goalProgress = Math.min(
    100,
    Math.round((booksReadThisYear / yearlyGoal) * 100),
  );

  // Dynamic Greeting
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const recentlyRead = books
    .filter((b) => b.lastRead)
    .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
    .slice(0, 5);

  const newBooks = books
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, 5);

  const authorMap = books.reduce((acc, book) => {
    const author = book.author || "Unknown Author";
    if (author === "Unknown Author") return acc;
    if (!acc[author]) {
      acc[author] = {
        name: author,
        books: 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=random`,
      };
    }
    acc[author].books += 1;
    return acc;
  }, {});

  const topAuthors = Object.values(authorMap)
    .sort((a, b) => b.books - a.books)
    .slice(0, 4);

  const stats = {
    total: books.length,
    read: books.filter((b) => b.category === "Completed").length,
    planned: books.filter((b) => b.category === "Planned").length,
    reading: books.filter((b) => b.category === "Reading").length,
  };

  const subjects = [
    {
      name: "Self-improvement",
      icon: <FlaskConical size={24} />,
      color: "var(--bg-secondary)",
    },
    {
      name: "Psychology",
      icon: <Brain size={24} />,
      color: "var(--bg-secondary)",
    },
    {
      name: "Novel",
      icon: <BookMarked size={24} />,
      color: "var(--bg-secondary)",
    },
    {
      name: "Biography",
      icon: <User size={24} />,
      color: "var(--bg-secondary)",
    },
    {
      name: "Sci-fi",
      icon: <Rocket size={24} />,
      color: "var(--accent-primary)",
      textColor: "var(--bg-primary)",
    },
    {
      name: "Mystery Thriller",
      icon: <Globe size={24} />,
      color: "var(--bg-secondary)",
    },
    {
      name: "Other",
      icon: <MoreHorizontal size={24} />,
      color: "var(--bg-secondary)",
    },
  ];

  const handleGenreClick = (genre) => {
    navigate(`/library?genre=${encodeURIComponent(genre)}`);
  };

  if (loading) {
    return (
      <div className="home-page fade-in">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Previous Reading</h2>
          </div>
          <div className="horizontal-scroll">
            {[1, 2, 3, 4].map((i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Genres</h2>
          </div>
          <div className="subjects-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <GenreCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="home-page fade-in">
      <header className="dashboard-header">
        <div className="greeting-wrapper">
          <h1 className="greeting-title">
            {greeting},{" "}
            <span
              className="clickable-user-name"
              onClick={() => navigate("/profile")}
              title="View Profile"
            >
              {userName || "Reader"}
            </span>
          </h1>
          <p className="greeting-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      <div className="stats-bento-grid">
        <div className="bento-card stat-card accent">
          <div className="stat-icon accent">
            <BookOpen size={24} />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Books</div>
        </div>
        <div className="bento-card stat-card success">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-value">{stats.read}</div>
          <div className="stat-label">Finished</div>
        </div>
        <div className="bento-card stat-card flame">
          <div className="stat-icon flame">
            <Flame size={24} />
          </div>
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="bento-card stat-card target">
          <div className="stat-icon target">
            <Target size={24} />
          </div>
          <div className="stat-value">
            {booksReadThisYear}/{yearlyGoal}
          </div>
          <div className="stat-label">Yearly Goal</div>
          <div className="stat-progress">
            <div
              className="stat-progress-bar glowing"
              style={{ width: `${goalProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-row">
        <div className="quick-action-card" onClick={() => navigate("/library")}>
          <div className="qa-icon library">
            <Library size={22} />
          </div>
          <div className="qa-content">
            <span className="qa-title">Browse Library</span>
            <span className="qa-sub">
              {stats.total} book{stats.total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate("/profile")}>
          <div className="qa-icon profile">
            <User size={22} />
          </div>
          <div className="qa-content">
            <span className="qa-title">View Profile</span>
            <span className="qa-sub">{stats.completed} completed</span>
          </div>
        </div>
        <div
          className="quick-action-card"
          onClick={() => setShowManualModal(true)}
        >
          <div className="qa-icon add">
            <Plus size={22} />
          </div>
          <div className="qa-content">
            <span className="qa-title">Add Book</span>
            <span className="qa-sub">Manual entry</span>
          </div>
        </div>
      </div>

      <ReadingHeatmap history={readingHistory} />

      {/* Previous Reading */}
      <section className="dashboard-section relative-section">
        <div className="section-header">
          <h2>Continue Reading</h2>
          <button className="filter-btn" onClick={() => navigate("/library")}>
            <Filter size={14} /> Filter
          </button>
        </div>
        <div className="horizontal-scroll hide-scrollbar with-fade">
          {recentlyRead.length > 0 ? (
            recentlyRead.map((book) => (
              <BookCard key={book.id} book={book} variant="simple" />
            ))
          ) : (
            <div className="empty-section">
              <p>No recent reading found. Start a book from your library!</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/library")}
              >
                Browse Library
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Subjects Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Explore Genres</h2>
        </div>
        <div className="subjects-grid bento-subjects">
          {subjects.map((subject) => {
            const count = books.filter((b) => b.genre === subject.name).length;
            return (
              <div
                key={subject.name}
                className="subject-card glass-panel"
                style={{
                  "--subject-color": subject.color,
                  "--subject-text": subject.textColor || "inherit",
                }}
                onClick={() => handleGenreClick(subject.name)}
              >
                <div
                  className="subject-icon-wrapper"
                  style={{ color: subject.textColor || "var(--text-primary)" }}
                >
                  {subject.icon}
                </div>
                <div className="subject-info">
                  <h3>{subject.name}</h3>
                  <p className="subject-count">
                    {count} {count === 1 ? "Book" : "Books"}
                  </p>
                </div>
                <div
                  className="subject-hover-glow"
                  style={{ background: subject.color }}
                ></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* New Books */}
      <section className="dashboard-section relative-section">
        <div className="section-header">
          <h2>Recently Added</h2>
          <button className="show-all" onClick={() => navigate("/library")}>
            Show all <ArrowRight size={14} />
          </button>
        </div>
        <div className="horizontal-scroll hide-scrollbar with-fade">
          {newBooks.length > 0 ? (
            newBooks.map((book) => (
              <BookCard key={book.id} book={book} variant="simple" />
            ))
          ) : (
            <div className="empty-section">
              <p>No books in your library yet.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={selectDirectory}
              >
                Add Folder
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Top Authors */}
      {topAuthors.length > 0 && (
        <section className="dashboard-section relative-section fade-in fade-in-delay-3">
          <div className="section-header">
            <h2>Favorite Authors</h2>
            <button className="show-all" onClick={() => navigate("/library")}>
              Show all <ArrowRight size={14} />
            </button>
          </div>
          <div className="horizontal-scroll hide-scrollbar with-fade">
            {topAuthors.map((author) => (
              <div
                key={author.name}
                className="author-card-large card"
                onClick={() => setSelectedAuthor(author.name)}
                title={`View details for ${author.name}`}
              >
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="author-avatar-large"
                />
                <div className="author-info-large">
                  <h3>{author.name}</h3>
                  <p>{author.books} Books</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showManualModal && (
        <AddManualBookModal onClose={() => setShowManualModal(false)} />
      )}
      {selectedAuthor && (
        <AuthorDetailModal
          authorName={selectedAuthor}
          onClose={() => setSelectedAuthor(null)}
        />
      )}
    </div>
  );
}

export default Home;
