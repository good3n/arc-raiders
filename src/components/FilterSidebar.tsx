import React from 'react'

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

interface FilterGroup {
  title: string
  options: string[]
  selected: string
  onSelect: (value: string) => void
  type?: 'buttons' | 'tags'
  showAll?: boolean
}

interface FilterSidebarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterGroups: FilterGroup[]
  className?: string
}

export default function FilterSidebar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Type to filter...',
  filterGroups,
  className = '',
}: FilterSidebarProps) {
  return (
    <aside className={classNames('sticky top-28', className)}>
      {/* Search Control */}
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold">Search</h3>
        <label className="block">
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            type="search"
            placeholder={searchPlaceholder}
            className="border-gray-300 w-full rounded-lg border px-3 py-2"
          />
        </label>
      </section>

      {/* Filter Groups */}
      {filterGroups.map((group, index) => (
        <div key={`${group.title}-${index}`} className={index > 0 ? 'mt-6' : ''}>
          <h3 className="mb-2 text-sm font-semibold">{group.title}</h3>

          {group.type === 'tags' ? (
            // Tag-style buttons (for rarities)
            <div className="flex flex-col gap-1">
              {group.showAll !== false && (
                <button
                  onClick={() => group.onSelect('all')}
                  className={classNames(
                    'item-tag rounded-md px-3 py-1.5 text-left text-sm font-medium transition-all',
                    group.selected === 'all'
                      ? 'bg-blue text-dark'
                      : 'bg-light text-dark hover:bg-blue'
                  )}
                >
                  All {group.title}
                </button>
              )}
              {group.options.map((option) => (
                <button
                  key={option}
                  onClick={() => group.onSelect(option)}
                  className={classNames(
                    'item-tag rounded-md px-3 py-1.5 text-left text-sm font-medium transition-all',
                    option.toLowerCase(),
                    group.selected === option ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            // Regular button style
            <div className="flex flex-wrap gap-1">
              {group.showAll !== false && (
                <button
                  onClick={() => group.onSelect('all')}
                  className={classNames(
                    'rounded-md px-3 py-1.5 font-medium transition-all',
                    group.selected === 'all'
                      ? 'bg-blue text-dark'
                      : 'bg-light text-dark hover:bg-blue'
                  )}
                >
                  All {group.options.length > 5 ? '' : group.title}
                </button>
              )}
              {group.options.map((option) => (
                <button
                  key={option}
                  onClick={() => group.onSelect(option)}
                  className={classNames(
                    'rounded-md px-3 py-1.5 font-medium transition-all',
                    group.selected === option
                      ? 'bg-blue text-dark'
                      : 'bg-light text-dark hover:bg-blue'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}
