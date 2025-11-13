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
  filterGroups: FilterGroup[]
  className?: string
  type?: string
}

export default function FilterSidebar({ filterGroups, type, className = '' }: FilterSidebarProps) {
  return (
    <section
      className={classNames(
        className,
        'sticky top-0 z-10 -mx-4 border-b border-light/10 bg-dark/90 px-4 py-4 backdrop-blur-lg'
      )}
    >
      <div
        className={classNames(
          type === 'weapons' ? 'grid grid-cols-[10fr_9fr] gap-3' : 'grid grid-cols-1 gap-3'
        )}
      >
        {/* Filter Groups */}
        {filterGroups.map((group, index) => (
          <div key={`${group.title}-${index}`}>
            <h3 className="mb-2 font-semibold">{group.title}</h3>

            {group.type === 'tags' ? (
              // Tag-style buttons (for rarities)
              <div className="flex flex-wrap gap-1">
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
                    All
                  </button>
                )}
                {group.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => group.onSelect(option)}
                    className={classNames(
                      'item-tag rounded-md px-3 py-1.5 text-left text-sm font-medium transition-all',
                      option.toLowerCase(),
                      group.selected === option ? 'opacity-100' : 'opacity-70 hover:opacity-100'
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
                      'rounded-md border px-3 py-1.5 text-sm font-medium uppercase transition-all',
                      group.selected === 'all'
                        ? 'border-transparent bg-light text-dark'
                        : 'bg-transparent border-light text-light hover:border-blue hover:bg-blue hover:text-dark'
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
                      'rounded-md border px-3 py-1.5 text-sm font-medium uppercase transition-all',
                      group.selected === option
                        ? 'border-transparent bg-light text-dark'
                        : 'bg-transparent border-light text-light hover:border-blue hover:bg-blue hover:text-dark'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
