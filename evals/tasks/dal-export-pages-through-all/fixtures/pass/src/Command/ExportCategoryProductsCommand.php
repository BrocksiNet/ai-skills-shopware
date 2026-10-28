<?php declare(strict_types=1);

namespace Swag\Example\Command;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\Dbal\Common\RepositoryIterator;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Filesystem\Filesystem;

#[AsCommand(name: 'swag:export:category-products', description: 'Writes the product IDs of a category to a file')]
class ExportCategoryProductsCommand extends Command
{
    private const BATCH_SIZE = 500;

    public function __construct(
        private readonly EntityRepository $productRepository,
        private readonly Filesystem $filesystem,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('categoryId', InputArgument::REQUIRED, 'Category ID (hex)');
        $this->addArgument('file', InputArgument::REQUIRED, 'Target file');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $context = Context::createCLIContext();
        $file = (string) $input->getArgument('file');

        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('categoriesRo.id', (string) $input->getArgument('categoryId')));
        $criteria->addSorting(new FieldSorting('id'));
        $criteria->setLimit(self::BATCH_SIZE);

        $this->filesystem->dumpFile($file, '');
        $iterator = new RepositoryIterator($this->productRepository, $context, $criteria);
        while (($ids = $iterator->fetchIds()) !== null) {
            $this->filesystem->appendToFile($file, implode("\n", $ids) . "\n");
        }

        return self::SUCCESS;
    }
}
