<?php declare(strict_types=1);

namespace Swag\Example\Command;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Filesystem\Filesystem;

#[AsCommand(name: 'swag:export:category-products', description: 'Writes the product IDs of a category to a file')]
class ExportCategoryProductsCommand extends Command
{
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

        // Bounded, but only the first 1000 IDs reach the file.
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('categoriesRo.id', (string) $input->getArgument('categoryId')));
        $criteria->setLimit(1000);

        $ids = $this->productRepository->searchIds($criteria, $context)->getIds();
        foreach ($ids as $id) {
            $this->filesystem->appendToFile((string) $input->getArgument('file'), $id . "\n");
        }

        return self::SUCCESS;
    }
}
